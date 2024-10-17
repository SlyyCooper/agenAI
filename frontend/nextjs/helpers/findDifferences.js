// This function compares two objects and returns an object describing their differences
function findDifferences(obj1, obj2) {
    // Helper function to check if a value is an object (but not an array)
    function isObject(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    }

    // Recursive function to compare two objects
    function compareObjects(o1, o2) {
        const changes = {};

        // Iterate through all keys in the first object
        for (const key in o1) {
            // If both values are objects, recursively compare them
            if (isObject(o1[key]) && isObject(o2[key])) {
                const nestedChanges = compareObjects(o1[key], o2[key]);
                if (Object.keys(nestedChanges).length > 0) {
                    changes[key] = nestedChanges;
                }
            } 
            // If both values are arrays, compare them
            else if (Array.isArray(o1[key]) && Array.isArray(o2[key])) {
                // Check if arrays have different lengths or different values
                if (o1[key].length !== o2[key].length || o1[key].some((val, index) => val !== o2[key][index])) {
                    changes[key] = { before: o1[key], after: o2[key] };
                }
            } 
            // For all other types, compare values directly
            else {
                if (o1[key] !== o2[key]) {
                    changes[key] = { before: o1[key], after: o2[key] };
                }
            }
        }

        // Check for keys in the second object that are not in the first
        for (const key in o2) {
            if (!(key in o1)) {
                changes[key] = { before: undefined, after: o2[key] };
            }
        }

        return changes;
    }

    // Start the comparison process
    return compareObjects(obj1, obj2);
}

// Export the function for use in other modules
export default findDifferences;