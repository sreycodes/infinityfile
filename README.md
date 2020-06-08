# infinityfile
The idea behind this project was to use Imgur's image upload API without any limits on number of images uploaded to create a 
theoretically safe and *infinite* file storage system by converting any file type to an encrypted image. Our original submission
is still available at the **master** branch.

## API specifications

| API Route | HTTP Method | Parameters | Description |
|-----------|-------------|------------|-------------|
| /register | POST | username | To register your username |
| /myfiles | POST | username | To view your uploaded files |
| /uploadSingleFile | POST | key, username, file | To upload a file. This can be used to upload multiple files/directories as our method supports zip files. |
| /downloadSingleFile | POST | key, username, filename | To download a file |

Some issues have been left as the project works as a POC currently.
