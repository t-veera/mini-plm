"""Reparse a product's markdown and print the resulting graph.

    python manage.py parse_traceability <product>           # newest container
    python manage.py parse_traceability <product> -c I2     # as seen from I2
    python manage.py parse_traceability <product> -c S1     # as seen from S1
    python manage.py parse_traceability <product> --no-reparse

`product` is an id or a name; `-c` takes a container label (I1, S2, ...). Output is
meant to be read against the source files.
"""
from django.core.management.base import BaseCommand, CommandError

from files.models import File, Iteration, Product, Stage
from files.traceability.containers import display_name, list_containers
from files.traceability.doctypes import detect_node_type
from files.traceability.graph import DOC_ORDER, build_graph
from files.traceability.parse import parse_file

STATUS_MARKS = {'GREEN': '[GREEN ]', 'YELLOW': '[YELLOW]', 'RED': '[RED   ]'}


class Command(BaseCommand):
    help = "Reparse a product's markdown files and print the traceability graph."

    def add_arguments(self, parser):
        parser.add_argument('product', help="Product id or name")
        parser.add_argument('-c', '--container', default=None,
                            help="Container label to view from, e.g. I2 or S1 (default: the newest)")
        parser.add_argument('--no-reparse', action='store_true',
                            help="Print the existing index without reparsing the files")

    def handle(self, *args, **options):
        product = self._resolve_product(options['product'])
        containers = list_containers(product)
        if not containers:
            raise CommandError(f"Product '{product.name}' has no stages or iterations.")
        scope = self._resolve_scope(containers, options['container'])

        if not options['no_reparse']:
            self._reparse(product)

        graph = build_graph(product, scope, containers=containers)
        self._print_order(containers, scope)
        self._print_resolution(graph)
        self._print_nodes(graph)
        self._print_edges(graph)
        self._print_counts(graph)

    # -- setup -------------------------------------------------------------------

    def _resolve_product(self, value):
        product = None
        if value.isdigit():
            product = Product.objects.filter(id=int(value)).first()
        if product is None:
            product = Product.objects.filter(name__iexact=value).first()
        if product is None:
            known = ', '.join(f"{p.id}:{p.name}" for p in Product.objects.all()) or 'none'
            raise CommandError(f"Product '{value}' not found. Known products: {known}")
        return product

    def _resolve_scope(self, containers, label):
        if not label:
            return containers[-1]
        wanted = label.strip().upper()
        for container in containers:
            if container.label.upper() == wanted or container.key == label:
                return container
        known = ', '.join(c.label for c in containers)
        raise CommandError(f"Container '{label}' not found. Known containers: {known}")

    # -- work --------------------------------------------------------------------

    def _reparse(self, product):
        files = _markdown_files(product)
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"Reparsing {len(files)} markdown file(s) for '{product.name}'"))

        indexed = skipped = 0
        for file in files:
            # Deliberately unguarded here: the command is the place a parse failure
            # should be loud. The upload path uses parse_file_safely instead.
            result = parse_file(file)
            if result is None:
                skipped += 1
                continue
            indexed += 1
            nodes, edges = result
            self.stdout.write(
                f"  {file.container_id:>4}  {file.name:<40} "
                f"{detect_node_type(file.name):<6} {nodes} node(s), {edges} edge(s)")
        self.stdout.write(f"  indexed {indexed}, skipped {skipped} (no doc type / unreadable)\n")

    def _print_order(self, containers, scope):
        self.stdout.write(self.style.MIGRATE_HEADING("\nContinuous IIL order (by created_at)"))
        trail = '  ->  '.join(
            f"[{c.label}]" if c.key == scope.key else c.label for c in containers)
        self.stdout.write(f"  {trail}      ([scope])")

    def _print_resolution(self, graph):
        scope = graph['scope']
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\nResolved documents as of {scope['display_name']}"))
        for entry in graph['resolved']:
            if entry['container_label'] is None:
                self.stdout.write(f"  {entry['node_type']:<6} --")
                continue
            mark = ' (inherited)' if entry['inherited'] else ''
            self.stdout.write(
                f"  {entry['node_type']:<6} {entry['container_label']}{mark}  "
                f"{', '.join(entry['files'])}")

    def _print_nodes(self, graph):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\nNodes ({len(graph['nodes'])})"))
        if not graph['nodes']:
            self.stdout.write("  none")
            return
        for node_type in DOC_ORDER:
            group = [n for n in graph['nodes'] if n['node_type'] == node_type]
            if not group:
                continue
            self.stdout.write(f"  {node_type}")
            for node in group:
                extras = []
                if node['test_status']:
                    extras.append(node['test_status'])
                if node['subsystem']:
                    extras.append(node['subsystem'])
                if node['inherited']:
                    extras.append(f"from {node['container_label']}")
                suffix = f"  ({', '.join(extras)})" if extras else ''
                self.stdout.write(
                    f"    {STATUS_MARKS[node['status']]} {node['tag_id']:<10} "
                    f"{_clip(node['title'], 60):<60} "
                    f"{node['source_file_name']}:{node['source_line']}{suffix}")

    def _print_edges(self, graph):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\nEdges ({len(graph['edges'])})"))
        if not graph['edges']:
            self.stdout.write("  none")
            return
        # Edges carry canonical keys; show the tags as the docs actually write them.
        written = {node['key']: node['tag_id'] for node in graph['nodes']}
        for edge in graph['edges']:
            parent = written.get(edge['parent'], edge['parent'])
            child = written.get(edge['child'], edge['child'])
            self.stdout.write(f"  {parent:>10}  ->  {child}")

    def _print_counts(self, graph):
        counts = graph['counts']
        self.stdout.write(self.style.MIGRATE_HEADING("\nStatus"))
        self.stdout.write(
            f"  GREEN {counts['GREEN']}   YELLOW {counts['YELLOW']}   "
            f"RED {counts['RED']}   total {counts['total']}")


def _markdown_files(product):
    """Every .md file attached to any stage or iteration of this product."""
    stage_ids = list(Stage.objects.filter(product=product).values_list('id', flat=True))
    iteration_ids = list(Iteration.objects.filter(product=product).values_list('id', flat=True))
    files = File.objects.filter(name__iendswith='.md').select_related('content_type')
    return [
        file for file in files
        if (file.container_type == 'stage' and file.object_id in stage_ids)
        or (file.container_type == 'iteration' and file.object_id in iteration_ids)
    ]


def _clip(text, limit):
    text = text or ''
    return text if len(text) <= limit else text[:limit - 1] + '…'
