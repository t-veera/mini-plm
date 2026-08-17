"""Traceability parsing tests.

Pure logic only -- no database, no media -- so they run in a second and say something
about the parser rather than about Django. The filenames and ID shapes here are the real
ones from the InkFrame document set; the false-positive list is the hardware vocabulary
that sits next to real IDs in those same documents.
"""
import io

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import File, Iteration, ManualTraceEdge, Product, TraceEdge, TraceNode

from .traceability.doctypes import AMBIGUOUS, EXCLUDED, MATCHED, UNMATCHED, classify, detect_node_type
from .traceability.extract import canonical, compile_id_pattern, iter_lines
from .traceability.parse import extract_lines
from .traceability.sheets import iter_sheet_lines


class DocTypeDetectionTests(SimpleTestCase):
    """Type comes from a keyword anywhere in the filename, never from its position."""

    def test_real_project_filenames(self):
        expected = {
            '1_INKFRAME-PRD-001-Rev2_0.md': 'PRD',
            '5_INKFRAME-ARCH-I2-001.md': 'ARCH',
            '3_INKFRAME-RISK-I2-001.md': 'RISK',
            '2_INKFRAME-SRS-I2-001.md': 'SRS',
            '7_INKFRAME-TST-I2-001.xlsx': 'VERIF',
        }
        for filename, node_type in expected.items():
            self.assertEqual(detect_node_type(filename), node_type, filename)

    def test_numeric_prefix_does_not_decide_the_type(self):
        """SRS is prefixed 2 and ARCH is prefixed 5; neither may follow the number."""
        self.assertEqual(detect_node_type('2_INKFRAME-SRS-I2-001.md'), 'SRS')
        self.assertEqual(detect_node_type('9_INKFRAME-SRS-I2-001.md'), 'SRS')
        self.assertEqual(detect_node_type('INKFRAME-SRS-I2-001.md'), 'SRS')

    def test_bare_arch_matches(self):
        """The old pattern needed sys_arch or architecture and missed a bare ARCH."""
        for filename in ('5_INKFRAME-ARCH-I2-001.md', 'sys_arch.md', 'Architecture.md',
                         'System Architecture.md'):
            self.assertEqual(detect_node_type(filename), 'ARCH', filename)

    def test_verification_synonyms_all_land_in_one_column(self):
        for filename in ('verification.md', 'INKFRAME-I2-VERIFY-001.md', 'VER-001.md',
                         'INKFRAME-FUNC-ACCP-TST-I2-001.xlsx', '001_Test_Protocol.md',
                         'Acceptance_Criteria.md'):
            self.assertEqual(detect_node_type(filename), 'VERIF', filename)

    def test_risk_synonyms(self):
        for filename in ('fmea.md', 'Risk_Register.md', '3_INKFRAME-RISK-I2-001.md'):
            self.assertEqual(detect_node_type(filename), 'RISK', filename)

    def test_scope_and_bench_are_excluded_by_design(self):
        """Uploads and previews normally; never reaches the parser."""
        for filename in ('4_INKFRAME-SCOPE-I2-001.md', 'INKFRAME-FEATURE-SCOPE-I2-001.md',
                         '6_INKFRAME-BENCH-I2-001.xlsx', 'S1_GATE_REVIEW.md'):
            result = classify(filename)
            self.assertEqual(result.outcome, EXCLUDED, filename)
            self.assertIsNone(result.node_type)

    def test_bench_beats_test_in_the_same_name(self):
        """INKFRAME-BENCH-TEST-I2-001.xlsx is bench data, not a verification protocol."""
        self.assertEqual(classify('INKFRAME-BENCH-TEST-I2-001.xlsx').outcome, EXCLUDED)

    def test_unmatched_is_reported_not_guessed(self):
        for filename in ('README.md', 'random-notes.md', '001_Known_Issues_Log.md'):
            self.assertEqual(classify(filename).outcome, UNMATCHED, filename)

    def test_short_abbreviations_do_not_run_wild(self):
        """VER and VAL as substrings would claim half the documents in a project."""
        for filename in ('PRD_Version2.md', 'Design_Overview.md', 'Delivery_Plan.md'):
            self.assertNotEqual(classify(filename).node_type, 'VERIF', filename)
        self.assertEqual(classify('Latest_Notes.md').outcome, UNMATCHED)

    def test_generic_words_lose_to_a_specific_type(self):
        """`spec` and `requirement` only mean SRS when nothing more specific is present."""
        self.assertEqual(detect_node_type('verification_spec.md'), 'VERIF')
        self.assertEqual(detect_node_type('PRD_Requirements.md'), 'PRD')
        self.assertEqual(detect_node_type('Architecture_Spec.md'), 'ARCH')
        self.assertEqual(detect_node_type('INKFRAME-I3-REQUIREMENTS.md'), 'SRS')
        self.assertEqual(detect_node_type('srs.md'), 'SRS')

    def test_genuinely_ambiguous_names_are_flagged_not_guessed(self):
        result = classify('Risk_and_Test_Plan.md')
        self.assertEqual(result.outcome, AMBIGUOUS)
        self.assertIsNone(result.node_type)
        self.assertEqual(result.candidates, ('RISK', 'VERIF'))

    def test_matched_reports_the_deciding_keyword(self):
        result = classify('5_INKFRAME-ARCH-I2-001.md')
        self.assertEqual((result.outcome, result.node_type, result.matched),
                         (MATCHED, 'ARCH', 'ARCH'))


class IdPatternTests(SimpleTestCase):
    """Three ID shapes are in use across the real documents; all three must index."""

    def setUp(self):
        self.id_re = compile_id_pattern()

    def assert_matches(self, tag):
        match = self.id_re.search(tag)
        self.assertIsNotNone(match, f'{tag} should be an id')
        self.assertEqual(match.group(0), tag)

    def test_iteration_shape(self):
        for tag in ('FR-I2-014', 'NFR-I2-017', 'AC-I2-001', 'PRD-I2-001',
                    'BLOCK-I2-002', 'IFACE-I2-001', 'ARCH-I2-001', 'RSK-S1-002'):
            self.assert_matches(tag)

    def test_flat_and_glued_shapes(self):
        for tag in ('RSK-101', 'RSK-04', 'T01', 'R001', 'G4', 'OQ-003', 'TST-001',
                    'SRS-301', 'REQ-01'):
            self.assert_matches(tag)

    def test_subsystem_shape_still_indexes(self):
        for tag in ('PRD-SYS-09', 'BLOCK-ELE-01', 'RISK-MEC-02'):
            self.assert_matches(tag)

    def test_hardware_vocabulary_is_not_an_id(self):
        """These sit in the same sentences as real IDs in the architecture doc."""
        for token in ('GPIO15', 'GPIO45', 'GPIO48', 'ESP32', 'ESP32-S3', 'TP4056',
                      'TP5400', 'UC8179', 'AO3401', 'MT3608', 'S8050', 'TP24', 'TP31',
                      'TXB0108E', 'RT9193-33', 'GDEQ0583T31', '22AWG', 'I2C', 'SPI2'):
            self.assertIsNone(self.id_re.search(token), token)

    def test_fr4_laminate_is_not_a_requirement(self):
        """FR4 and FR-4 are PCB material. FR-014 and FR-I2-014 are requirements."""
        self.assertIsNone(self.id_re.search('FR4'))
        self.assertIsNone(self.id_re.search('FR-4'))
        self.assert_matches('FR-014')
        self.assert_matches('FR-I2-014')

    def test_ac_supply_rail_is_not_an_id(self):
        for token in ('AC12', 'AC-DC12', 'ACCP-001'):
            self.assertIsNone(self.id_re.search(token), token)
        self.assert_matches('AC-001')

    def test_canonical_folds_separators_and_zero_padding(self):
        self.assertEqual(canonical('FR-I2-014'), canonical('fr_i2_014'))
        self.assertEqual(canonical('R001'), canonical('R-1'))


class MarkdownExtractionTests(SimpleTestCase):
    def extract(self, text):
        return extract_lines(iter_lines(text))

    def test_iteration_ids_declare_and_link(self):
        nodes, edges = self.extract(
            '### FR-I2-014 — Settings menu\n'
            'The settings menu satisfies PRD-I2-001.\n'
        )
        self.assertEqual([n.tag_id for n in nodes], ['FR-I2-014'])
        self.assertEqual(nodes[0].title, 'Settings menu')
        self.assertEqual(edges, [(canonical('PRD-I2-001'), canonical('FR-I2-014'))])

    def test_mid_sentence_id_in_a_table_cell_is_not_a_declaration(self):
        nodes, _ = self.extract(
            '| ID | Test Name |\n'
            '|----|-----------|\n'
            '| INPUT — audit T08 before this section | |\n'
            '| T08 | Input Map |\n'
        )
        self.assertEqual([n.tag_id for n in nodes], ['T08'])
        self.assertEqual(nodes[0].title, 'Input Map')

    def test_pass_criteria_column_is_not_read_as_a_result(self):
        nodes, _ = self.extract(
            '| ID | Test Name | Pass Criteria | Status |\n'
            '|----|-----------|---------------|--------|\n'
            '| T01 | Cold boot | Must not fail on retry | |\n'
        )
        self.assertIsNone(nodes[0].test_status)

    def test_latest_run_column_wins(self):
        nodes, _ = self.extract(
            '| ID | Test Name | Run 1 Status | Run 2 Status |\n'
            '|----|-----------|--------------|--------------|\n'
            '| T01 | Cold boot | PASS | FAIL |\n'
            '| T02 | Page turn | PASS | |\n'
        )
        self.assertEqual([n.test_status for n in nodes], ['FAIL', 'PASS'])


class SheetExtractionTests(SimpleTestCase):
    """A protocol workbook travels the same path a markdown table does."""

    HEADERS = ['ID', 'Test Name', 'Category', 'Steps', 'Pass Criteria',
               'Run 1\nStatus', 'Run 2\nStatus']

    def workbook(self, sheets):
        import openpyxl
        book = openpyxl.Workbook()
        book.remove(book.active)
        for name, rows in sheets:
            sheet = book.create_sheet(name)
            for row in rows:
                sheet.append(row)
        stream = io.BytesIO()
        book.save(stream)
        stream.seek(0)
        return stream

    def protocol(self, rows, name='Test Protocol', preamble=2):
        body = [['INKFRAME I2 — Functional Acceptance'], ['Hardware: I2 PCB']][:preamble]
        return self.workbook([(name, body + [self.HEADERS] + rows)])

    def test_reads_ids_and_titles_under_a_title_block(self):
        stream = self.protocol([
            ['T01', 'Cold Boot to Home Screen', 'Boot', '1. Insert SD', 'Boots', '', ''],
            ['T02', 'Library Population', 'Boot', '1. Insert SD', 'Lists books', '', ''],
        ])
        nodes, _ = extract_lines(iter_sheet_lines(stream))
        self.assertEqual([n.tag_id for n in nodes], ['T01', 'T02'])
        self.assertEqual(nodes[0].title, 'Cold Boot to Home Screen')

    def test_section_banner_rows_declare_nothing(self):
        stream = self.protocol([
            ['  BOOT & LIBRARY', '', '', '', '', '', ''],
            ['T01', 'Cold Boot to Home Screen', 'Boot', '', '', '', ''],
            ['  INPUT — audit T08 before running this section', '', '', '', '', '', ''],
            ['T08', 'Input Map vs CrossPoint UI', 'Input', '', '', '', ''],
        ])
        nodes, _ = extract_lines(iter_sheet_lines(stream))
        self.assertEqual([n.tag_id for n in nodes], ['T01', 'T08'])
        self.assertEqual(nodes[1].title, 'Input Map vs CrossPoint UI')

    def test_status_comes_from_the_last_run_that_was_filled_in(self):
        stream = self.protocol([
            ['T01', 'Cold boot', 'Boot', '', 'Must not fail', 'PASS', 'FAIL'],
            ['T02', 'Page turn', 'Input', '', 'Must not fail', 'PASS', ''],
            ['T03', 'Sleep', 'Power', '', 'Must not fail', '', ''],
        ])
        nodes, _ = extract_lines(iter_sheet_lines(stream))
        self.assertEqual([n.test_status for n in nodes], ['FAIL', 'PASS', None])

    def test_references_written_in_a_cell_become_edges(self):
        stream = self.protocol([
            ['T01', 'Cold boot', 'Boot', 'Verifies FR-I2-014', '', '', ''],
        ])
        nodes, edges = extract_lines(iter_sheet_lines(stream))
        self.assertEqual(edges, [(canonical('FR-I2-014'), canonical('T01'))])

    def test_only_the_protocol_sheet_is_read(self):
        stream = self.workbook([
            ('0. Overview', [['Document: INKFRAME-TST-I2-001'], ['Scope: features']]),
            ('Test Protocol', [self.HEADERS, ['T01', 'Cold boot', '', '', '', '', '']]),
            ('Run Summary', [['Date'], ['Tester']]),
        ])
        nodes, _ = extract_lines(iter_sheet_lines(stream))
        self.assertEqual([n.tag_id for n in nodes], ['T01'])

    def test_a_workbook_with_no_id_column_yields_nothing(self):
        """The bench workbook's shape: test points, no IDs. Never raises."""
        stream = self.workbook([
            ('1. Bare Connectivity',
             [['TP / Ref', 'Net / Signal', 'Expected Result'],
              ['TP23', 'VBUS', '4.75 - 5.25 V']]),
        ])
        self.assertEqual(extract_lines(iter_sheet_lines(stream)), ([], []))

    def test_an_unreadable_workbook_yields_nothing(self):
        self.assertEqual(extract_lines(iter_sheet_lines(io.BytesIO(b'not a workbook'))), ([], []))


class ManualEdgeTests(APITestCase):
    """Hand-drawn links: a second source of truth, unioned with the parsed edges."""

    def setUp(self):
        self.user = User.objects.create_user('tester', 'tester@test.com', 'password123')
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(name='InkFrame', owner=self.user)
        self.iteration = Iteration.objects.create(
            product=self.product, name='Bring-up', iteration_number=1)
        self.file = File.objects.create(
            name='2_INKFRAME-SRS-I2-001.md', owner=self.user,
            content_type=ContentType.objects.get_for_model(Iteration),
            object_id=self.iteration.id,
        )
        self.node('PRD', 'PRD-I2-001')
        self.node('SRS', 'FR-I2-014')
        self.node('SRS', 'FR-I2-013')
        self.node('VERIF', 'T01', test_status='PASS')
        self.url = f'/api/traceability/{self.product.id}/link/'

    def node(self, node_type, tag_id, **extra):
        return TraceNode.objects.create(
            product=self.product, source_iteration=self.iteration,
            source_container_key=f'iteration:{self.iteration.id}', source_file=self.file,
            node_type=node_type, tag_id=tag_id, title=tag_id, **extra)

    def graph(self):
        response = self.client.get(f'/api/traceability/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def status_of(self, tag_id):
        key = canonical(tag_id)
        return next(n['status'] for n in self.graph()['nodes'] if n['key'] == key)

    def edge(self, graph, parent, child):
        parent, child = canonical(parent), canonical(child)
        return next((e for e in graph['edges']
                     if e['parent'] == parent and e['child'] == child), None)

    def link(self, parent, child, method='post'):
        return getattr(self.client, method)(
            self.url, {'parent': canonical(parent), 'child': canonical(child)}, format='json')

    def test_a_manual_link_is_marked_manual_in_the_graph(self):
        response = self.link('PRD-I2-001', 'FR-I2-014')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        edge = self.edge(self.graph(), 'PRD-I2-001', 'FR-I2-014')
        self.assertIsNotNone(edge)
        self.assertTrue(edge['manual'])

    def test_manual_links_clear_an_orphan_exactly_as_parsed_ones_would(self):
        """An intermediate node needs BOTH sides -- the pre-existing orphan rule, which
        manual edges feed into unchanged. One link up is not enough on its own."""
        self.assertEqual(self.status_of('FR-I2-014'), 'RED')

        self.link('PRD-I2-001', 'FR-I2-014')
        self.assertEqual(self.status_of('FR-I2-014'), 'RED')  # upstream only: still orphaned

        self.link('FR-I2-014', 'T01')
        self.assertEqual(self.status_of('FR-I2-014'), 'GREEN')

    def test_unlinking_returns_the_node_to_orphan(self):
        self.link('PRD-I2-001', 'FR-I2-014')
        self.link('FR-I2-014', 'T01')
        self.assertEqual(self.status_of('FR-I2-014'), 'GREEN')

        response = self.link('PRD-I2-001', 'FR-I2-014', method='delete')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.status_of('FR-I2-014'), 'RED')
        self.assertIsNone(self.edge(self.graph(), 'PRD-I2-001', 'FR-I2-014'))

    def test_a_parsed_edge_cannot_be_unlinked_here(self):
        TraceEdge.objects.create(
            product=self.product, parent_tag_id=canonical('PRD-I2-001'),
            child_tag_id=canonical('FR-I2-013'), source_file=self.file)

        response = self.link('PRD-I2-001', 'FR-I2-013', method='delete')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('document', response.data['error'])
        self.assertIsNotNone(self.edge(self.graph(), 'PRD-I2-001', 'FR-I2-013'))

    def test_a_parsed_edge_stays_solid_even_if_also_drawn_by_hand(self):
        """Redundant is harmless -- but it must not start rendering as a manual link."""
        TraceEdge.objects.create(
            product=self.product, parent_tag_id=canonical('PRD-I2-001'),
            child_tag_id=canonical('FR-I2-013'), source_file=self.file)
        self.link('PRD-I2-001', 'FR-I2-013')

        edges = [e for e in self.graph()['edges'] if e['child'] == canonical('FR-I2-013')]
        self.assertEqual(len(edges), 1)
        self.assertFalse(edges[0]['manual'])

    def test_linking_twice_is_not_an_error(self):
        self.assertEqual(self.link('PRD-I2-001', 'FR-I2-014').status_code,
                         status.HTTP_201_CREATED)
        self.assertEqual(self.link('PRD-I2-001', 'FR-I2-014').status_code,
                         status.HTTP_200_OK)
        self.assertEqual(ManualTraceEdge.objects.count(), 1)

    def test_a_node_cannot_link_to_itself(self):
        response = self.link('FR-I2-014', 'FR-I2-014')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_ends_are_rejected(self):
        self.assertEqual(self.client.post(self.url, {'parent': 'FR-I2-014'}, format='json')
                         .status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_edge_whose_other_end_is_not_in_view_is_not_drawn(self):
        self.link('RSK-999', 'FR-I2-014')
        self.assertIsNone(self.edge(self.graph(), 'RSK-999', 'FR-I2-014'))
        self.assertEqual(self.status_of('FR-I2-014'), 'RED')

    def test_a_manual_edge_survives_reparsing_the_document(self):
        """The reason this table keys on tags: reparsing deletes and rewrites TraceNodes."""
        self.link('PRD-I2-001', 'FR-I2-014')
        TraceNode.objects.filter(source_file=self.file).delete()
        TraceEdge.objects.filter(source_file=self.file).delete()
        self.node('PRD', 'PRD-I2-001')
        self.node('SRS', 'FR-I2-014')

        self.assertEqual(ManualTraceEdge.objects.count(), 1)
        self.assertIsNotNone(self.edge(self.graph(), 'PRD-I2-001', 'FR-I2-014'))

    def test_the_link_records_who_drew_it(self):
        self.link('PRD-I2-001', 'FR-I2-014')
        self.assertEqual(ManualTraceEdge.objects.get().created_by, self.user)

    def test_authentication_is_required(self):
        self.client.force_authenticate(user=None)
        self.assertIn(self.link('PRD-I2-001', 'FR-I2-014').status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
