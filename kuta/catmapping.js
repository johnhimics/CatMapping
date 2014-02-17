/*Category mapping javascript
 *
 * Author: John Himics
 * Email: J.Himics@gmail.com
 * Version: 0.4
 * 
 * Dropdown CSE selector created
 * CSE tree created (no lazy loading)
 * 
 *
 *
 *
 *
 *
 */


/* This closure keeps your globals from leaking into the global
 * namespace but still makes them available to all of the code in the
 * app. */
(function ($, _) {
    // GLOBAL VARIABLES
    var LAZYLOADINGTHRESHHOLD = 800, CHILDPAGINGTHRESHHOLD = 100, CHILDPAGESIZE = 25; 
    var CSEROOTURL = "../api/v1.0/csecategories/";
    var CSECHILDURL = "../api/v1.0/csecategory/";
    var CSESTATSURL = "../api/v1.0/csecategorystats/";
    var CATROOTURL = "../api/v1.0/categories";
    var CATCHILDURL = "../api/v1.0/category/";

    /* This is the preferred onDocumentReady syntax for jQuery at the moment. */
    $(function () {
	//*** TREE STRUCTURES
	//DataModel - represents each node
	var TreeNode = Backbone.Model.extend( {
        //defaults
        parent_id: 0,
        id: 0,
        name: "",

        initialize: function() {
            //pass
        }

	});


	// Tree Collection - represents the tree
	var TreeCollection = Backbone.Collection.extend({
        model: TreeNode,
        //defaults
        rootURL: "",
        childURL: "",
        statsURLroot: "",
        statsURL: "",
        id: 2,
        url: this.rootURL + this.id,
        TOTALNODES: 100,
        MAXCHILDNODES: 20,

        initialize: function(props) {
            var that = this;
            // constructor values
            that.rootURL = props.rootURL;
            that.childURL = props.childURL;
            that.statsURLroot = props.statsURL;
            that.statsURL = that.statsURLroot + that.id;
            that.id = props.id,
            that.url = that.rootURL + that.id;
            
            // get the stats (make this a model)
            that.getStats();
		
            //Calling function for fetch commands
            that.load();
        },

        update: function(id, callback) {
            console.log("update called");
            var that = this;
            that.id = id;
            that.url = that.rootURL + that.id;
            that.statsURL = that.statsURLroot + that.id;
            that.reset(); //to fire the reset event. empties the collection
        },
        
        getStats: function (callback) {
            var that = this;
            var stats = $.getJSON(that.statsURL, function() {
                that.TOTALNODES = stats.responseJSON.total_nodes;
                that.MAXCHILDNODES = stats.responseJSON.max_child_nodes;
                if(callback) {callback();};
                }
            );
        },
        
        load: function (callback) {
            var that = this;
            var lazyLoadEnabled = that.TOTALNODES > LAZYLOADINGTHRESHHOLD;
            var childPagingEnabled = (lazyLoadEnabled &&
                                      that.MAXCHILDNODES > CHILDPAGINGTHRESHHOLD)
            console.log("lazy load enabled: " + lazyLoadEnabled);
            console.log("total nodes: " + that.TOTALNODES);
            
            //testing the new fetch functions

            //that.fetchRoot();
            //that.fetchChildren();

            if(lazyLoadEnabled) {
            
                console.log("Lazy Loading Enabled!");
                
                if(childPagingEnabled) {
                    // get the first page of root nodes
                    console.log("Lazy and Child Lazy");
                    that.fetch({success: function() {if(callback) {callback();};}});
                } else {
                    //get all the root nodes
                    console.log("Lazy but not child lazy");
                    that.fetch({success: function() {if(callback) {callback();};}});
                }
            
            } else {
                console.log("I'm NOT lazy!'")
                that.fetch({success: function() {if(callback) {callback();};}});
            }
            
        }, //Implementation of lazy loading
        
        fetchRoot: function(callback) {            
            this.url = this.rootURL + this.id
            this.fetch(
                {success: function() {          //success function
                    console.log("fetched");
                    if(callback) {
                    callback();
                    };
                }}
                );
        },
        
        fetchChildren: function(child, callback) {
            console.log("FETCH CHILDREN CALLED");
            if(child) {
                //fetch only that child
                this.url = this.childURL + this.id + "/" + child;
            
                this.fetch(
                    {success: function() {          //success function
                        console.log("fetched");
                        if(callback) {
                        callback();
                        };
                    }}
                    );
            } else {
                console.log("in the else statement");
                // fetch all children
                this.url = this.childURL + this.id + "/";
                /*var dirList = $.get(this.url, function (data) {
                    console.log(data);
                    _.each(data, function (){
                        console.log(value); 
                    })
                    });*/
                
                
                /*this.fetch(
                    {success: function() {          //success function
                        console.log("fetched");
                        if(callback) {
                        callback();
                        };
                    }}
                    );*/
            }
        }  
        
	});

	var CatTreeCollection = TreeCollection.extend({
        initialize: function(props) {
            var that = this;
            that.rootURL = props.rootURL;
            that.childURL = props.childURL;
            that.id = props.id,
            that.url = that.rootURL;

            that.fetch({success: function(c, r) {
                //pass
            }});
        },
	});


	// Tree View - Renders the tree
	var TreeView = Backbone.View.extend({
        //defaults
        collection : {},
        selectTag : "",
        el : "",

        initialize: function(props) {
            this.collection = props.coll;
            this.listenTo(this.collection, "reset", this.collectionChanged);
            this.selectTag = props.selectTag;
            this.el = props.el;
            //workaround for select tag event
            $(this.selectTag).change({that: this}, this.selected);
            //initialize the tree with no data
            this.$el.tree({data: []});
            //fetch and render
            var that = this;
            this.collection.fetch({success: function() { that.render() }});
        },

        render: function() {
            //get tree data
            console.log("Tree render function");
            var treedata = this.getTreeData();
            //pass tree data to tree
            this.$el.tree('loadData', treedata);
        },

        events: {
            //pass
            "tree.select" : "treeSelect",
            "tree.open" : "treeOpen"
            //"change this.collection" : "collectionChanged"
        },

        selected : function(e) {
            var that = e.data.that;
            var selected = e.target.value;
            that.collection.update(
                    selected, 
                    function() {
                        console.log("callback successful!"); //test callback, can be removed
                    });
        }, // function called with the <select> tag selects something new

        collectionChanged : function(e) {
            var that = this;
            console.log("CollectionChanged function");
            that.collection.getStats(function () {
                that.collection.load( function() {
                                    console.log("Loaded callback");
                                    that.render();
                                });
            });
        }, // function called when the collection is updated

        getTreeData : function() {
            var that = this;
            var data = [];
            var rootNodes = that.collection.where({parent_id: 0});
            console.log(rootNodes);
            _.each(rootNodes, 
                           (function (c) {
                   var children = that.recurHelper(c.get("id"));
                   var root = {"label": c.get("name"),
                                           "children" : children};
                   data.push(root);
                           }), 
                           that);
            return data;
        },

        recurHelper : function(parent_id) {
            var that = this;
            var data = [];
            var childNodes = that.collection.where({parent_id: parent_id});
            _.each(childNodes,
                           (function (c) { 
                   var children = that.recurHelper(c.get("id"));
                   var child = {"label": c.get("name"),
                        "children" : children};
                   data.push(child);
                           }), 
                           that);
            return data;
        },

        treeSelect : function() {
            console.log("Tree Select event caught");
        },

        treeOpen : function() {
            console.log("Tree Open event caught");
        }

	});


	//*** DROPDOWN STRUCTURES
	var DropDownColl = Backbone.Collection.extend({
        initialize: function(props){
            console.log("DropDownColl init");
            this.url = props.url;
            var that = this;

            this.fetch({success: function() {
                        //pass
            }});
        }
	}); //Collection for the select tags

	var SelectView = Backbone.View.extend({

        attributes : function () {
            return {
                el : this.get('el'),
                collection : this.get('collection')
                //tvi : this.get('treeviewinstance')
            };
        }, //enable the constructor`

        initialize: function() {
            $("#cseselect").change(choiceMade); //workaround for change event
            $("#catselect").change(choiceMade);
        },

        render: function() {
            var that = this;
            that.collection.fetch({
                        success: function() {
                            //***render the template***
                            var source = $("#selectTemplate").html();
                            var output = Mustache.render(source, that.collection.models);
                            $(that.el).html(output);
                        }
            });
        },

        events: {
            // onchange event wouldn't work here
        },

        test: function() {
            console.log("test");
        }
	}); // view that handles the select tags

	var choiceMade = function(e) {
        //This is when the select tag is used
        /*      console.log("choiceMade");
         console.log(e);
         console.log(e.target.name);*/
        var index = e.target.selectedIndex;
        var selectedName = e.target.options[index].label;

        return true;
	}; // function that handles selections in the dropdowns

	//*** VARIABLES
	//Dropdown variables
	var cseselectcoll = new DropDownColl({url: "../api/v1.0/cse"}); // constructor isn't working
	var categoryselectcoll = new DropDownColl({url: "../api/v1.0/categories"}); // constructor isn't working
	var viewCseSelect = new SelectView({
        el : "#cseselect",
        collection : cseselectcoll
	});

	//CSE Tree variables
	var cseTreeCollection = new TreeCollection({
        childURL: CSECHILDURL,
        rootURL: CSEROOTURL,
        id: 2,
        statsURL: CSESTATSURL
	});
	var cseview = new TreeView({
        coll : cseTreeCollection,
        selectTag : "#cseselect",
        el: "#csetree"
	});
	var catTreeCollection = new CatTreeCollection({
        childURL: CATCHILDURL,
        rootURL: CATROOTURL,
        id: 1
	});
	var catview = new TreeView({
        coll : catTreeCollection,
        selectTag : "#catselect",
        el: "#cattree"
	});

	//*** ROUTER
	//declare the backbone router
	var Router = Backbone.Router.extend( {
        routes: {
            '': 'home' //The homepage
        }
	});

	var router = new Router();
	router.on('route:home', function() {
        console.log("The home page has loaded.");
        //render functions
        //viewCatSelect.render();
        viewCseSelect.render();
        cseview.render();
	});

	Backbone.history.start(); 
    
    });
})(jQuery, _);
