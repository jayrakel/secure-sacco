import os
import glob

# Search for all tsx files in src
files = glob.glob('src/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    if 'profilePhotoUrl' in content and '<img ' in content:
        print(f"Modifying {file}...")
        
        # We need to add the import if it's not there
        if 'AuthenticatedImage' not in content:
            # Find the last import
            last_import_idx = content.rfind("import ")
            end_of_last_import = content.find("\n", last_import_idx)
            
            # Count directories deep to figure out the import path
            depth = file.count('/') - 1
            if file.startswith('src/'):
                depth = file.count('/') - 1
            
            dots = '../' * depth
            import_statement = f"\nimport {{ AuthenticatedImage }} from '{dots}shared/components/AuthenticatedImage';"
            
            content = content[:end_of_last_import+1] + import_statement + content[end_of_last_import+1:]
        
        # Replace <img with <AuthenticatedImage
        # And make sure fallback is provided if needed, but for now just replace <img with <AuthenticatedImage
        content = content.replace('<img src={user.profilePhotoUrl}', '<AuthenticatedImage src={user.profilePhotoUrl}')
        content = content.replace('<img src={user?.profilePhotoUrl}', '<AuthenticatedImage src={user?.profilePhotoUrl}')
        content = content.replace('<img src={member.profilePhotoUrl}', '<AuthenticatedImage src={member.profilePhotoUrl}')
        content = content.replace('<img src={member?.profilePhotoUrl}', '<AuthenticatedImage src={member?.profilePhotoUrl}')
        
        # Handle the one in ProfilePage.tsx specifically
        # Actually ProfilePage.tsx already has it because I did it manually!
        
        with open(file, 'w') as f:
            f.write(content)
