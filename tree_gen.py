import os

def should_exclude(path):
    excludes = {
        'node_modules', '.next', '__pycache__', 
        '__init__.py', 'LICENSE', 'setup.py',
        'README.md', 'cli.py', 'tests', 'venv', '.git', '.pytest_cache',
        '.DS_Store', '.cursorignore', '.cursorrules'
    }
    return any(exclude in path for exclude in excludes)

def generate_tree(startpath, prefix=''):
    tree = []
    files = sorted(os.listdir(startpath))
    
    for f in files:
        if should_exclude(f):
            continue
            
        path = os.path.join(startpath, f)
        if os.path.isdir(path):
            # Add directory
            tree.append(f'{prefix}├── {f}')
            # Recursively add subdirectories
            subtree = generate_tree(path, prefix + '│   ')
            tree.extend(subtree)
        else:
            tree.append(f'{prefix}├── {f}')
            
    return tree

if __name__ == '__main__':
    print('\n'.join(['.'] + generate_tree('.')))
