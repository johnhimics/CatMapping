/*
This pseudo-code just describes the general algorithm. It is not instructions on how to organize your code.
*/

var LAZYLOADINGTHRESHHOLD = 3000, CHILDPAGINGTHRESHHOLD = 100, CHILDPAGESIZE = 25; 

// EVENT: The user has selected a CSE from the dropdown, so get the stats for it

var stats = selectedCse.getCategoryStats(),
    lazyLoadingEnabled = false,
    childPagingEnabled = false,
    categories = new CategoryCollection(selectedCse.id);

lazyLoadingEnabled = stats["total_nodes"] >= LAZYLOADINGTHRESHOLD;
childPagingEnabled = (stats["max_child_nodes"] >= CHILDPAGINGTHRESHHOLD) && lazyLoadingEnabled;

if (lazyLoadingEnabled) {
  // Get the root nodes only
  if (childPagingEnabled) {
    // Get the first page of root nodes
    categories.fetch({"parent_id": 0,
                      "page_num": 0,
                      "items_per_page": CHILDPAGESIZE});    
  } else {
    // Get all of the root nodes
    categories.fetch({"parent_id": 0});
  }

} else {
  // Get the whole tree
  categories.fetch();
}

// Bind the jqTree and tell the binding code to configure the event handlers for node selection with or
// without lazy loading and child paging.
bindJqTree(categories, lazyLoadingEnabled, childPagingEnabled);

// Bind the jqTree and tell the binding code to configure the event handlers for node selection with or
// without lazy loading and child paging.
bindJqTree(categories, lazyLoadingEnabled, childPagingEnabled);


//seems like it expects something like the data shown here
// http://mbraak.github.io/jqTree/   which is pretty restrictive

function getJQStructure(categories) {
    var data = [];
    // loop through each root node
    categories.where({"parent_id": 0}).each(function (c) {
        var children = getJQStructureChildren(categories, c.get("id")); //call helper to build children
        var root = {"label": c.name,
                    "children": children}; // make object
        data.push(root); // push object
    });
    return data;
}

// this is essentially the same as above, with a slight difference
function getJQStructureChildren(categories, parentId) {
    var childNodes = categories.where({"parent_id": parentId}),
        children = [];
    // if there are no children it will return an empty array,
    // which is ideal (because it won't run the each() ? )
    childNodes.each(function (c) {
        var child = {"label": c.name,
                    "children": getJQStructureChildren(
                         categories, c.get("id")};
        children.push(root);
    });
    return children;
}

// Get the whole tree
data = getJQStructure(categories);
jqTree.bindMagic({"data":data})

function onCategoryNodeClicked(categories, parentId, childPagingEnabled) {
    // If this node has the name "<more>" or something
    // get it's page-number attribute so you know where to start
    // also need to get items-per-page from somewhere
    if (childPagingEnabled) {
        var pageNumber = parseInt($(this).attr("page-number"), 10) + 1;
        categories.fetch({"parent_id": parentId,
                         "success": bindJQTree,
                         "page_num": pageNumber});
    } else {
      categories.fetch({"parent_id": parentId,
                        "success": bindJQTree});
    }
}

function bindJQTree(someargs) {
  // Figure out which sub-tree was just loaded and call
  // getJQStructureChildren with the parentID
  
}