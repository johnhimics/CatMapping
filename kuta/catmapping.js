/*jslint vars: true */
/*jslint vars: true */
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
 * TODO:    Loading spinner (perfect it)
 *          Lazy-loading, once API is built
 *          Make sure mappings save properly, once API is built
 *          EMULATE HTTP option enable (get POST and DELETE to work)
 *
 * NOTES:   Every CSE has enable_tree_mappings = false ??
 *          loading spinner jumps and freezes
 *          
 * 
 */

/*jslint nomen: true */
/*jslint browser: true*/
/*jslint vars: true */
/*globals $, jQuery, _, Backbone, console, Mustache, Spinner*/




/* This closure keeps your globals from leaking into the global
 * namespace but still makes them available to all of the code in the
 * app. */
(function ($, _) {
    //EMULATE HTTP AND JSON
    Backbone.emulateHTTP = true;
    Backbone.emulateJSON = true;
    
    "use strict";
    /*Spin.js for initial loading*/
    var opts = {
            lines: 10, // The number of lines to draw
            length: 25, // The length of each line
            width: 8, // The line thickness
            radius: 30, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: '#000', // #rgb or #rrggbb or array of colors
            speed: 1, // Rounds per second
            trail: 20, // Afterglow percentage
            shadow: false, // Whether to render a shadow
            hwaccel: false, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        };
    var aRequest;
    var requests = [];
    var spintarget = document.getElementById('spinnerDIV');
    var spinner = new Spinner(opts);
    spinner.spin(spintarget);
    
    // GLOBAL VARIABLES
    var LAZYLOADINGTHRESHHOLD = 80, CHILDPAGINGTHRESHHOLD = 200, CHILDPAGESIZE = 5;
    // FOR THE SERVER 
    var CSEROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategories/",
        CSECHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategory/",
        CSESTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategorystats/",
        CATROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/categories",
        CATCHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/category/",
        CATSTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/categorystats/",
        MAPSTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mappingstats/", //<cse_id::integer> GET
        MAPURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mappings/", //<cse_id::integer> GET or POST or DELETE
        DROPDOWNURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/cse";
    
     //FOR LOCAL TESTING
  /*  var    CSEROOTURL = "../api/v1.0/csecategories/";
    var CSECHILDURL = "../api/v1.0/csecategory/";
    var CSESTATSURL = "../api/v1.0/csecategorystats/";
    var CATROOTURL = "../api/v1.0/categories";
    var CATCHILDURL = "../api/v1.0/category/";
    var MAPSTATSURL = "../api/v1.0/mappingstats/"; //<cse_id::integer> GET
    var MAPURL = "../api/v1.0/mapping/"; //<cse_id::integer> GET or POST or DELETE
    var DROPDOWNURL ="../api/v1.0/cse";
*/
    /* This is the preferred onDocumentReady syntax for jQuery at the moment. */
    $(function () {
    
	//*** TREE STRUCTURES
	//DataModel - represents each node
        var TreeNode = Backbone.Model.extend({
            //defaults
            parent_id: 0,
            id: 0,
            name: "",

            initialize: function () {
                //pass
            }

        });
        // add this to your namespace and have all of your collections inherit from it
        var JSON_HANDLER_COLLECTION = Backbone.Collection.extend({
            parse: function (resp, xhr) {
                if (typeof (resp.results) !== "undefined") {
                    return resp.results;
                } else if (typeof (resp.result) !== "undefined") {
                    return resp.result;
                } else {
                    console.log("no results array, returning resp");
                    return resp;
                }
            }
        });
        
        // Tree Collection - represents the tree
        var TreeCollection = JSON_HANDLER_COLLECTION.extend({
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
            page_num: 0,
            page_size: CHILDPAGESIZE,
            paged: false,

            initialize: function (props) {
                console.log("tree init");
                var that = this;
                // constructor values
                that.rootURL = props.rootURL;
                that.childURL = props.childURL;
                that.statsURLroot = props.statsURL;
                that.statsURL = that.statsURLroot + that.id;
                that.id = props.id;
                that.url = that.rootURL + that.id;

                // get the stats (make this a model)
                that.getStats();

                //Calling function for fetch commands
                that.load();
            },

            update: function (id, callback) {
                var that = this;
                that.id = id;
                that.url = that.rootURL + that.id;
                that.statsURL = that.statsURLroot + that.id;
                that.reset(null, {silent: true}); //empty the collection
                that.getStats(function () {
                    that.load(function () {
                        that.trigger("reset"); //to fire the reset event.
                    });
                });
            },

            getStats: function (callback) {
                var that = this;
                spinner.spin(spintarget);
                var stats = $.getJSON(that.statsURL)
                    .always(function () {
                        spinner.stop();
                    })
                    .done(function () {
                        if (typeof (stats.responseJSON.TOTALNODES) !== "undefined") {
                            that.TOTALNODES = stats.responseJSON.total_nodes;
                            that.MAXCHILDNODES = stats.responseJSON.max_child_nodes;
                            console.log(that.TOTALNODES);
                            console.log(that.MAXCHILDNODES);
                        } else {
                            that.TOTALNODES = stats.responseJSON.results.total_nodes;
                            that.MAXCHILDNODES = stats.responseJSON.results.max_child_nodes;
                            console.log(that.TOTALNODES);
                            console.log(that.MAXCHILDNODES);
                        }
                        if (typeof (callback) !== "undefined") {callback(); }
                    })
                    .fail(function () {
                        console.log("tree stats call fail");
                        that.TOTALNODES = 1;
                        that.MAXCHILDNODES = 1;
                        if (typeof (callback) !== "undefined") {callback(); }
                    });
                    
            },

            load: function (callback, id, context) {
                if (typeof (context) !== "undefined") {
                    var that = context;
                    console.log("manually defined context");
                } else {
                    var that = this;
                }
                var lazyLoadEnabled = that.TOTALNODES > LAZYLOADINGTHRESHHOLD;
                var childPagingEnabled = (lazyLoadEnabled &&
                                          that.MAXCHILDNODES > CHILDPAGINGTHRESHHOLD);
                console.log(that.TOTALNODES);
                console.log(that.MAXCHILDNODES);

                //that.lazyload(callback);
                //override for testing
                
                if (lazyLoadEnabled) {

                    if(typeof (id) !== "undefined") {
                        if (childPagingEnabled) {
                            // get the first page of root nodes
                            console.log("Load the child nodes in pages");
                            that.paged = true;
                            console.log(id);
                            that.lazyload(callback, 1, that.page_num, that.page_size, id);
                            //ADD A LOAD MORE HERE.
                        } else {
                            //get all the root nodes
                            console.log("Load all child nodes");
                            that.lazyload(callback, 1, that.page_num, null, id);
                        }
                    } else {
                        console.log("Load all root nodes");
                        that.lazyload(callback, 1, that.page_num, null, 0);
                    }

                } else {
                    console.log("I'm NOT lazy!'");
                    that.paged = false;
                    that.lazyload(callback, 0);
                }

            }, //Implementation of lazy loading

            lazyload: function (callback, lazystyle, page_number, page_size, parent_id) {
                var that = this;
                spinner.spin(spintarget);
                
                if (lazystyle === 0 || typeof (lazystyle) === "undefined") {
                    aRequest = that.fetch()
                        .always(function () {
                            spinner.stop();
                        })
                        .done(function () {
                            if (typeof (callback) !== "undefined") { callback(); }
                        })
                        .fail(function () {
                            console.log("Tree Collection Load failed");
                            if (typeof (callback) !== "undefined") { callback(); } //try to render anyway
                        });
                    requests.push(aRequest);
                } else if (lazystyle === 1) { // lazy load based on page_num and page_size
                    aRequest = that.fetch(
                        {remove: false,
                            data: {
                                page_number: page_number,
                                page_size: page_size,
                                parent_id: parent_id
                            }}
                    )
                        .always(function () {
                            spinner.stop();
                        })
                        .done(function () {
                            if (typeof (callback) !== "undefined") {
                                callback();
                            }
                        })
                        .fail(function () {
                            console.log("Tree Collection Load failed");
                        });
                    requests.push(aRequest);
                } else if (lazystyle === 2) { //Child Paging?
                    console.log("2");
                } else if (lazystyle === 3) { //load all children of one node
                    console.log("3");
                }
            }
        });

        var CatTreeCollection = TreeCollection.extend({
            
            initialize: function (props) {
                var that = this;
                // constructor values
                that.rootURL = props.rootURL;
                that.childURL = props.childURL;
                //that.statsURLroot = props.statsURL;
                //that.statsURL = that.statsURLroot + that.id;
                that.id = props.id;
                that.url = that.rootURL;

                // get the stats (make this a model)
                //that.getStats();

                //Calling function for fetch commands
                that.load();
            }
        });

        // Tree View - Renders the tree
        var TreeView = Backbone.View.extend({
            //defaults
            collection : {},
            selectTag : "",
            el : "",
            selectedElement : "",
            selectCollection : {},
            loadButton: "",

            initialize: function (props) {
                this.collection = props.coll;
                this.selectTag = props.selectTag;
                this.selectedElement = props.selectedElement;
                this.selectCollection = props.selectCollection;
                this.el = props.el;
                this.loadButton = props.loadButton;
                //workaround for select tag event
                this.listenTo(this.collection, "reset", this.render);
                this.listenTo(this.collection, "add", this.render); //added to defeat the callback/xhr race
                $(this.loadButton).click({that: this}, this.loadMoreRoot);
                $(this.selectTag).change({that: this}, this.selected);
                //initialize the tree with no data
                this.$el.tree({data: []});
                
                //load the collection
                var that = this;
                this.collection.load(function () { that.render(); });
            },

            render: function () {
                //get tree data
                var treedata = this.getTreeData();
                //handle the next, prev buttons for paging the tree **TODO**
                //if (this.collection.paged === true) { render buttons
                //}
                //pass tree data to tree
                this.$el.tree('loadData', treedata);
            },

            events: {
                "tree.select" : "treeSelect",
                "tree.open" : "treeOpen",
                "tree.click" : "treeClick"
            },

            selected : function (e) {
                var that = e.data.that;
                var selected = e.target.value;
                that.collection.update(selected);
            }, // function called with the <select> tag selects something new

            collectionChanged : function (e) {
                var that = this;
                this.collection.page_num = 0; //reset page number so lazy loading starts over
                that.render();
            }, // function called when the collection is updated

            getTreeData : function () {
                var that = this;
                var data = [];
                var rootNodes = that.collection.where({parent_id: 0});
                
                //REMOVE THIS **TODO** implemented to deal with different naming schemes
                if (rootNodes.length === 0) {
                    rootNodes = that.collection.where({parentId: 0});
                }
                _.each(rootNodes,
                               function (c) {
                        var children = that.recurHelper(c.get("id"));
                        var root = {"label": c.get("name"),
                                    "id" : c.get("id"),
                                    "children" : children};
                        data.push(root);
                    },
                               that);
                return data;
            }, // Builds the tree data, uses recurHelper

            recurHelper : function (parent_id) {
                var that = this;
                var data = [];
                var childNodes = that.collection.where({parent_id: parent_id});
                //REMOVE THIS **TODO** implemented to deal with different naming schemes
                if (childNodes.length === 0) {
                    childNodes = that.collection.where({parentId: parent_id});
                }
                _.each(childNodes,
                               function (c) {
                        var children = that.recurHelper(c.get("id"));
                        var child = {"label": c.get("name"),
                            "id" : c.get("id"),
                            "children" : children};
                        data.push(child);
                    },
                               that);
                return data;
            }, // recursive function to build tree data

            treeSelect : function (e) {
                e.preventDefault();
                var node = e.node;
                if (node !== null) {
                    $(this.selectedElement).html(node.name);
                } else {
                    console.log("deselected");
                    $(this.selectedElement).html("Nothing Selected");
                }
            },

            treeOpen : function () {
                //console.log("Tree Open event caught");
            },

            treeClick : function (e) {
                console.log("Tree click event caught");
                var node = e.node;
                var id = e.node.id;
                
                var cse_id = parseInt($(this.selectTag)[0].value, 10);
                
                var nodeArray = this.collection.findWhere({id: id});
                var mappable = nodeArray.attributes.is_mappable;
                nodeArray = this.selectCollection.where({id: cse_id});
                var treeMappable = nodeArray[0].attributes.enforce_leaf_mappings;
                //Override treeMappable  **TODO** implemented since tree_mappable always seems to be false.
                treeMappable = true;
                
                //prevent the default selection
                e.preventDefault();
                //determine if node is selected          
                if (this.$el.tree('isNodeSelected', node)) {
                    console.log("deselect");
                    this.$el.tree('selectNode', null);
                } else {
                //select the node if mappable
                    if (treeMappable !== false) {
                        if (mappable !== false) {
                            this.$el.tree('selectNode', node);
                            //$(this.selectedElement).html(node.name);
                        }
                    }
                //load children if necessary
                    console.log(node);
                    var that = this;
                    console.log(that);
                    if (node.children.length === 0) {
                        that.collection.load(that.render(), id, that.collection);
                    }
                }
            },
            
            loadMoreRoot : function (e) {
                var that = e.data.that;
                console.log("Load the next page!");
                that.collection.page_num += 1;
                that.collection.load(that.render());
            }
        });

        var CatTreeView = TreeView.extend({
            events : {
                "tree.select" : "treeSelect",
                "tree.open" : "treeOpen"
            },

            treeSelect : function (e) {
                var node = e.node;
                if (node !== null) {
                    $(this.selectedElement).html(node.name);
                } else {
                    $(this.selectedElement).html("Nothing Selected");
                }
            } // over-ridden to select and deselect without looking at is_mappable
        });

        //*** MAPPING STRUCTURES

        var MapModel = Backbone.Model.extend({
            //defaults
            yourcategory_id: 0,
            cse_id: 0,
            csecategory_id: 0,

            initialize: function () {
                //pass
            }
        });

        var MapCollection = JSON_HANDLER_COLLECTION.extend({
            model: MapModel,

            //defaults 
            url: "",
            rooturl: "",
            statsURL: "",
            rootStatsURL: "",
            cse_id: 0,
            total_mappings: 0,

            initialize: function (props) {
                // constructor values
                this.cse_id = props.cse;
                this.rooturl = props.mapurl;
                this.rootStatsURL = props.rootStatsURL;
                this.setURL(this.cse_id);
                

                this.getStats(); //get the stats
            },

            setURL : function (id) {
                this.url = this.rooturl + id;
                this.statsURL = this.rootStatsURL + id;
            },

            getStats: function (callback) {
                var that = this;
                
                var stats = $.getJSON(that.statsURL)
                    .always(function () {
                        spinner.spin(spintarget);
                    })
                    .done(function () {
                        console.log("success");
                        that.total_mappings = stats.responseJSON.total_mappings;
                        if (typeof (callback) !== "undefined") {callback(); }
                    })
                    .fail(function () {
                        console.log("Mapping Stats fetch error");
                        spinner.stop();
                        that.total_mappings = 0;
                        if (typeof (callback) !== "undefined") {callback(); }
                    });
                    
            }
        });

        var MapView = Backbone.View.extend({
            //defaults
            collection : {},
            el : "",
            button : "",
            cse: {},
            cat: {}, // References to the cse and category views
            selectTag: "", //reference to the select tag
            page: 1,
            items_per_page: 50,
            pages: 0,

            initialize: function (props) {
                this.collection = props.collection;
                this.listenTo(this.collection, "add", this.render);  //event binding
                this.listenTo(this.collection, "remove", this.render);
                this.el = props.el;
                this.button = props.button;
                this.cse = props.cse;
                this.cat = props.cat;
                this.selectTag = props.selectTag;
                //this.listenTo($(this.button), 'click', this.buttonClick);
                $(this.button).click({that: this}, this.buttonClick); //Mapping Button
                this.listenTo(this.cse.collection, "reset", this.collectionChanged);
                var that = this;
                that.collectionChanged();
            },

            render: function () {
                var that = this;
                var source = $("#mapTemplate").html();
                var pages = [], counter, index;
                that.pages = Math.floor((that.collection.length / that.items_per_page)) + 1;

                for (counter = 1; counter <= that.pages; counter += 1) {
                    pages.push(counter);
                }
                var names = [];
                $.each(that.collection.slice((that.page - 1) *
                            that.items_per_page, (that.page) * that.items_per_page),
                        function (index, model) {
                        var cseid = model.get("csecategory_id");
                        var catid = model.get("yourcategory_id");
                        var csename = "";
                        var placeholder = that.cse.collection.where({id: parseInt(cseid, 10)})[0];
                        if (typeof (placeholder) !== "undefined") {
                            csename = placeholder.attributes.name;
                        } else {
                            csename = "Name Undefined";
                            console.log("Placeholder was undefined");
                        }
                        var catname = "";
                        placeholder = that.cat.collection.where({id: parseInt(catid, 10)})[0];
                        if (typeof (placeholder) !== "undefined") {
                            catname = placeholder.attributes.name;
                        } else {
                            catname = "Name Undefined";
                            console.log("Placeholder was undefined");
                        }

                        var nameObj = {csecategory_id: cseid,
                                   cse_id: model.get("cse_id"),
                                   yourcategory_id: catid,
                                   cse_name: csename,
                                   cat_name: catname
                                   };
                        names.push(nameObj);
                    });
                var tableData =
                    {data : names,
                        pages : pages,
                        btnclick: that.btnclick };

                var output = Mustache.render(source,
                    tableData,
                    ((this.page) * this.items_per_page));
                $(that.el).html(output);

                //map the buttons
                that.$el.off("click", '#PageButton', that.btnclick);
                that.$el.on("click", '#PageButton', {page: -1, that: that},
                                    that.btnclick);
                $('#btnnext').click({page: 'next', that: that},
                                    that.btnclick);
                $('#btnprev').click({page: 'prev', that: that},
                                    that.btnclick);
                //map the delete links
                that.$el.off("click", '#DeleteLink', that.deleteLinkClicked);
                that.$el.on("click", '#DeleteLink', {that: that}, that.deleteLinkClicked);
            },

            deleteLinkClicked : function (e) {
                console.log(e);
                var that = e.data.that;
                var model = that.collection.where({csecategory_id: e.currentTarget.dataset.cse,
                                                   yourcategory_id : e.currentTarget.dataset.cat});
                console.log(model);
                
                that.collection.sync("delete", that.collection.remove(model));
            },
            
            btnclick : function (e) {
                var that = e.data.that;
                if (e.data.page === 'next') {
                    if ((that.page + 1) <= that.pages) {that.page = that.page + 1; } //replace with num of pages
                } else if (e.data.page === 'prev') {
                    if ((that.page - 1) >= 1) {that.page = that.page - 1; } //replace with num of pages
                } else {
                    that.page = parseInt(e.currentTarget.innerHTML, 10);
                }
                console.log(that.page);
                that.render();
            },

            buttonClick : function (e) {
                var that = e.data.that;
                var selectedCSE = that.cse.$el.tree('getSelectedNode');
                var selectedCat = that.cat.$el.tree('getSelectedNode');

                var parentID = parseInt($(that.selectTag + " option:selected").val(), 10);

                var newMapping = {"yourcategory_id" : selectedCat.id,
                                  "cse_id" : parentID,
                                  "csecategory_id" : selectedCSE.id};
                var newModel = that.collection.create(newMapping);
                that.render();
            },

            collectionChanged : function () {
                // fires when the cse collection has been reset (dropdown used)
                this.collection.setURL(this.cse.collection.id);
                this.collection.getStats();
                var that = this;
                aRequest = that.collection.fetch()
                    .always(function () {
                        spinner.spin(spintarget);
                    })
                    .done(function (c, r) {
                        that.pages = Math.floor((r.length / that.items_per_page)) + 1;
                        that.render();
                    })
                    .fail(function () {
                        console.log("MAPPING LOAD FAIL");
                        spinner.stop();
                        that.pages = 1;
                        that.render();
                    });
                requests.push(aRequest);
            }
        });

        //*** DROPDOWN STRUCTURES
        var DropDownColl = JSON_HANDLER_COLLECTION.extend({
            initialize: function (props) {
                this.url = props.url;
                var that = this;
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

            initialize: function () {
                $("#cseselect").change(this.choiceMade); //workaround for change event
                $("#catselect").change(this.choiceMade);
            },

            render: function () {
                var that = this;
                that.collection.fetch()
                .done( function () {
                    //***render the template***
                    var source = $("#selectTemplate").html();
                    var output = Mustache.render(source, that.collection.models);
                    $(that.el).html(output);
                } )
                .fail( function () {
                    console.log("Select Box fetch failed");
                });
            },

            choiceMade : function (e) {
                var index = e.target.selectedIndex;
                var selectedName = e.target.options[index].label;

                return true;
            } // function that handles selections in the dropdowns
        }); // view that handles the select tags

        //*** VARIABLES
        //Dropdown variables
        var cseselectcoll = new DropDownColl({url: DROPDOWNURL});
        var viewCseSelect = new SelectView({
            el : "#cseselect",
            collection : cseselectcoll
        });

        // Tree variables
        var cseTreeCollection = new TreeCollection({
            childURL: CSECHILDURL,
            rootURL: CSEROOTURL,
            id: 2,
            statsURL: CSESTATSURL
        });
        var cseview = new TreeView({
            coll : cseTreeCollection,
            selectTag : "#cseselect",
            el: "#csetree",
            selectedElement: "#activeCSE",
            selectCollection: cseselectcoll,
            loadButton: "#loadMoreRootCSE"
        });
        var catTreeCollection = new CatTreeCollection({
            childURL: CATCHILDURL,
            rootURL: CATROOTURL,
            statsURL: MAPSTATSURL,
            id: 1
        });
        var catview = new CatTreeView({
            coll : catTreeCollection,
            selectTag : "#catselect",
            el: "#cattree",
            selectedElement: "#activeCat",
            loadButton: "#loadMoreRootCAT"
        });
        var mapTreeCollection = new MapCollection({
            mapurl : MAPURL,
            rootStatsURL : MAPSTATSURL,
            cse: 2
        });
        var mapView = new MapView({
            el : "#MappingTable",
            collection : mapTreeCollection,
            button : "#mappingButton",
            cse : cseview,
            cat : catview,
            selectTag : "#cseselect"
        });

        //*** ROUTER
        //declare the backbone router
        var Router = Backbone.Router.extend({
            routes: {
                '': 'home' //The homepage
            }
        });

        var router = new Router();
        router.on('route:home', function () {
            //render functions
            //viewCatSelect.render();
            console.log("router called");
            viewCseSelect.render();
        });

        Backbone.history.start();
        //$.when.apply($, requests).done(function () { spinner.stop(); });

    });
}(jQuery, _));

/*var activeAJAX = 0;

Before making an AJAX call, activeAJAX++;

After completing an AJAX call (in the callback): if (--activeAJAX == 0) { allDone(); }
allDone = spinner.stop()
*/
