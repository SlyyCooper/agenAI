import json
import os
import re
from typing import Dict, Any, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TypeScript to Python type mapping
TS_TO_PY_TYPES = {
    'string': 'str',
    'number': 'int',
    'boolean': 'bool',
    'Date': 'datetime',
    'Timestamp': 'DatetimeWithNanoseconds',
    'array': 'list',
    'Array<any>': 'list',
    'any[]': 'list',
    'object': 'dict',
    'int': 'int',
    'float': 'float',
    'bool': 'bool',
    'list': 'list',
    'dict': 'dict',
    'null': 'NoneType'
}

def load_firestore_schema() -> Dict[str, Any]:
    """Load the actual Firestore schema"""
    try:
        with open('.memory/firestore_schema.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Firestore schema file not found. Run verify_schema.py first.")
        return {}

def parse_collection_hint(comment: str) -> str:
    """Extract collection name from JSDoc comment"""
    if not comment:
        return None
    match = re.search(r'@collection\s+([^\s\*]+)', comment)
    return match.group(1) if match else None

def parse_typescript_types() -> Tuple[Dict[str, Dict[str, str]], Dict[str, str]]:
    """Parse TypeScript interfaces and their collection mappings from firebase.types.ts"""
    typescript_schemas = {}
    collection_mappings = {}
    current_interface = None
    current_comment = []
    
    try:
        with open('frontend/nextjs/types/interfaces/firebase.types.ts', 'r') as f:
            lines = f.readlines()
            
        for line in lines:
            line = line.strip()
            
            # Skip empty lines and closing braces
            if not line or line == '}':
                continue
            
            # Capture JSDoc comments
            if '/**' in line:
                current_comment = [line]
                continue
            elif line.startswith('*'):
                current_comment.append(line)
                continue
            elif '*/' in line:
                current_comment.append(line)
                # Process the complete comment
                full_comment = ' '.join(current_comment)
                collection_name = parse_collection_hint(full_comment)
                if collection_name:
                    # Look ahead for the interface name
                    for next_line in lines[lines.index(line)+1:]:
                        if 'export interface' in next_line:
                            interface_name = next_line.split(' ')[2]
                            collection_mappings[collection_name] = interface_name
                            break
                current_comment = []
                continue
            
            # Find interface declarations
            if line.startswith('export interface'):
                current_interface = line.split(' ')[2]
                typescript_schemas[current_interface] = {}
            
            # Parse interface fields
            elif current_interface and ':' in line and not line.startswith('//'):
                field, type_def = line.split(':', 1)
                field = field.strip()
                type_def = type_def.strip().rstrip(';')
                typescript_schemas[current_interface][field] = type_def
                
    except FileNotFoundError:
        logger.error("TypeScript types file not found")
        return {}, {}
    
    logger.info(f"Found collection mappings: {collection_mappings}")
    logger.info(f"Found interfaces: {list(typescript_schemas.keys())}")
    
    return typescript_schemas, collection_mappings

def find_matching_interface(collection: str, typescript_schemas: Dict[str, Dict[str, str]], collection_mappings: Dict[str, str]) -> str:
    """Find matching TypeScript interface for a Firestore collection"""
    # First try direct collection mapping
    if collection in collection_mappings:
        interface = collection_mappings[collection]
        if interface in typescript_schemas:
            return interface
    
    # Try matching by interface name
    collection_base = collection.lower().rstrip('s')
    for interface_name in typescript_schemas.keys():
        # Skip utility interfaces and auth interfaces
        if interface_name in ['FirestoreTimestamp', 'FirestoreDocument', 'UseStorageReturn', 'StorageFile', 'FirebaseUser']:
            continue
            
        # Try exact match first
        if collection_base == interface_name.lower().rstrip('s'):
            return interface_name
            
        # Then try partial match
        if collection_base in interface_name.lower():
            return interface_name
    
    return None

def clean_typescript_type(ts_type: str) -> str:
    """Clean up TypeScript type for comparison"""
    # Remove comments
    ts_type = re.sub(r'//.*$', '', ts_type)
    # Take first union type
    ts_type = ts_type.split('|')[0].strip()
    # Remove optional marker
    ts_type = ts_type.replace('?', '')
    # Handle array types
    if ts_type.endswith('[]'):
        base_type = ts_type[:-2]
        ts_type = f"Array<{base_type}>"
    # Remove whitespace
    ts_type = ts_type.strip()
    return ts_type

def compare_schemas():
    """Compare Firestore schema with TypeScript types"""
    logger.info("Starting schema comparison...")
    
    # Load schemas
    firestore_schema = load_firestore_schema()
    typescript_schema, collection_mappings = parse_typescript_types()
    
    if not firestore_schema or not typescript_schema:
        logger.error("Failed to load schemas")
        return
    
    # Compare schemas
    print("\nSchema Comparison Results:")
    print("=========================")
    
    for collection, data in firestore_schema.items():
        print(f"\nCollection: {collection}")
        
        if 'error' in data:
            print(f"Error accessing collection: {data['error']}")
            continue
            
        # Find matching TypeScript interface
        matching_interface = find_matching_interface(collection, typescript_schema, collection_mappings)
        
        if not matching_interface:
            print("⚠️  No matching TypeScript interface found")
            continue
            
        print(f"Matching TypeScript interface: {matching_interface}")
        print("\nField Comparison:")
        
        # Compare fields
        ts_fields = typescript_schema[matching_interface]
        fs_fields = data['schema']
        
        # Fields in Firestore but not in TypeScript
        missing_in_ts = set(fs_fields.keys()) - set(ts_fields.keys())
        if missing_in_ts:
            print("\n❌ Fields in Firestore but missing in TypeScript:")
            for field in missing_in_ts:
                print(f"  - {field}: {fs_fields[field]['type']}")
        
        # Fields in TypeScript but not in Firestore
        missing_in_fs = set(ts_fields.keys()) - set(fs_fields.keys())
        if missing_in_fs:
            print("\n❌ Fields in TypeScript but missing in Firestore:")
            for field in missing_in_fs:
                print(f"  - {field}: {ts_fields[field]}")
        
        # Type mismatches
        print("\nType comparisons:")
        for field in set(fs_fields.keys()) & set(ts_fields.keys()):
            fs_type = fs_fields[field]['type']
            ts_type = clean_typescript_type(ts_fields[field])
            
            expected_py_type = TS_TO_PY_TYPES.get(ts_type, ts_type)
            if fs_type != expected_py_type:
                print(f"❌ Type mismatch for {field}:")
                print(f"   Firestore: {fs_type}")
                print(f"   TypeScript: {ts_type}")
            else:
                print(f"✅ {field}: types match ({fs_type})")

def main():
    """Main execution function"""
    compare_schemas()

if __name__ == "__main__":
    main() 