from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Product, Stage, File, Folder


class FolderAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('tester', 'tester@test.com', 'password123')
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(name='Widget', owner=self.user)
        self.other_product = Product.objects.create(name='Gadget', owner=self.user)
        self.stage = Stage.objects.create(product=self.product, name='Design', stage_number=1)

    def make_file(self, name='part.stl', folder=None):
        return File.objects.create(
            name=name,
            owner=self.user,
            content_type=ContentType.objects.get_for_model(Stage),
            object_id=self.stage.id,
            folder=folder,
        )

    def test_create_folder(self):
        response = self.client.post('/api/folders/', {'name': 'Electronics', 'product': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Folder.objects.count(), 1)

    def test_rename_folder(self):
        folder = Folder.objects.create(name='Old Name', product=self.product)
        response = self.client.patch(f'/api/folders/{folder.id}/', {'name': 'New Name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        folder.refresh_from_db()
        self.assertEqual(folder.name, 'New Name')

    def test_tree_fetch_returns_nested_structure(self):
        root = Folder.objects.create(name='Root', product=self.product)
        child = Folder.objects.create(name='Child', parent=root, product=self.product)
        Folder.objects.create(name='Grandchild', parent=child, product=self.product)
        self.make_file(folder=root)

        response = self.client.get(f'/api/products/{self.product.id}/folders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        root_data = response.data[0]
        self.assertEqual(root_data['name'], 'Root')
        self.assertEqual(root_data['file_count'], 1)
        self.assertEqual(len(root_data['children']), 1)
        self.assertEqual(root_data['children'][0]['name'], 'Child')
        self.assertEqual(len(root_data['children'][0]['children']), 1)
        self.assertEqual(root_data['children'][0]['children'][0]['name'], 'Grandchild')

    def test_move_folder_into_own_descendant_rejected(self):
        root = Folder.objects.create(name='Root', product=self.product)
        child = Folder.objects.create(name='Child', parent=root, product=self.product)

        response = self.client.patch(f'/api/folders/{root.id}/', {'parent': child.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        root.refresh_from_db()
        self.assertIsNone(root.parent)

    def test_move_folder_into_itself_rejected(self):
        folder = Folder.objects.create(name='Solo', product=self.product)
        response = self.client.patch(f'/api/folders/{folder.id}/', {'parent': folder.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_move_folder_across_products_rejected(self):
        folder = Folder.objects.create(name='Mine', product=self.product)
        other_folder = Folder.objects.create(name='Other', product=self.other_product)
        response = self.client.patch(f'/api/folders/{folder.id}/', {'parent': other_folder.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_reparent_succeeds(self):
        root = Folder.objects.create(name='Root', product=self.product)
        other = Folder.objects.create(name='Other', product=self.product)
        response = self.client.patch(f'/api/folders/{other.id}/', {'parent': root.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        other.refresh_from_db()
        self.assertEqual(other.parent_id, root.id)

    def test_delete_non_empty_folder_with_files_rejected(self):
        folder = Folder.objects.create(name='Has Files', product=self.product)
        self.make_file(folder=folder)
        response = self.client.delete(f'/api/folders/{folder.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Folder.objects.filter(id=folder.id).exists())

    def test_delete_non_empty_folder_with_subfolders_rejected(self):
        parent = Folder.objects.create(name='Parent', product=self.product)
        Folder.objects.create(name='Child', parent=parent, product=self.product)
        response = self.client.delete(f'/api/folders/{parent.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Folder.objects.filter(id=parent.id).exists())

    def test_delete_empty_folder_succeeds(self):
        folder = Folder.objects.create(name='Empty', product=self.product)
        response = self.client.delete(f'/api/folders/{folder.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Folder.objects.filter(id=folder.id).exists())

    def test_move_file_into_folder_and_back_to_root(self):
        folder = Folder.objects.create(name='Target', product=self.product)
        file_obj = self.make_file()

        response = self.client.patch(f'/api/files/{file_obj.id}/', {'folder': folder.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_obj.refresh_from_db()
        self.assertEqual(file_obj.folder_id, folder.id)

        response = self.client.patch(f'/api/files/{file_obj.id}/', {'folder': None}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_obj.refresh_from_db()
        self.assertIsNone(file_obj.folder_id)

    def test_move_file_into_folder_from_other_product_rejected(self):
        other_folder = Folder.objects.create(name='Other', product=self.other_product)
        file_obj = self.make_file()

        response = self.client.patch(f'/api/files/{file_obj.id}/', {'folder': other_folder.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
