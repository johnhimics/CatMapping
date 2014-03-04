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
 * TODO:    Loading spinner
 *          Lazy-loading, once API is built
 *          Make sure mappings save properly, once API is built
 *          tree mapping enabled functionality
 *
 *
 *
 *
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
    var spinner = new Spinner(opts)
    spinner.spin(spintarget);
    
    // GLOBAL VARIABLES
    var LAZYLOADINGTHRESHHOLD = 800, CHILDPAGINGTHRESHHOLD = 100, CHILDPAGESIZE = 25,
        CSEROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategories/",
        CSECHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategory/",
        CSESTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategorystats/",
        CATROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/categories",
        CATCHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/category/",
        MAPSTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mappingstats/", //<cse_id::integer> GET
        MAPURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mapping/"; //<cse_id::integer> GET or POST or DELETE

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

            initialize: function (props) {
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
                //spinner.spin(spintarget);
                that.getStats(function () {
                    that.load(function () {
                        that.trigger("reset"); //to fire the reset event.
                        //spinner.stop();
                    });
                });
            },


            getStats: function (callback) {
                var that = this;
                var stats = $.getJSON(that.statsURL, function () {
                    that.TOTALNODES = stats.responseJSON.total_nodes;
                    that.MAXCHILDNODES = stats.responseJSON.max_child_nodes;
                    if (typeof (callback) !== "undefined") {callback(); }
                }
                    );
            },

            load: function (callback) {
                var that = this;
                var lazyLoadEnabled = that.TOTALNODES > LAZYLOADINGTHRESHHOLD;
                var childPagingEnabled = (lazyLoadEnabled &&
                                          that.MAXCHILDNODES > CHILDPAGINGTHRESHHOLD);

                that.lazyload(callback);

                /*if(lazyLoadEnabled) {

                    console.log("Lazy Loading Enabled!");

                    if(childPagingEnabled) {
                        // get the first page of root nodes
                        console.log("Lazy and Child Lazy");
                        that.fetchRoot(callback);
                    } else {
                        //get all the root nodes
                        console.log("Lazy but not child lazy");
                        that.fetchRoot(callback);
                    }

                } else {
                    console.log("I'm NOT lazy!'")
                    that.fetchRoot(callback);
                }*/

            }, //Implementation of lazy loading

            lazyload: function (callback, child) {
                var that = this;

                that.url = that.rootURL + that.id;

                aRequest = this.fetch({ success: function () {
                    if (typeof (child) !== "undefined") {
                        that.url = that.childURL + that.id + "/" + child;
                        that.fetch({reset: false,
                            success: function () {
                                if (typeof (callback) !== "undefined") { console.log("CHILD FETCH SUCCESS"); callback(); }
                            },
                            error: function () { console.log("CHILD FAIL"); callback(); }
                            });
                    } else {
                        if (typeof (callback) !== "undefined") { callback(); }
                    }
                }});
                requests.push(aRequest);
            } //fetch the root and a single child file. currently erases the root when fetching the child.

        });

        var CatTreeCollection = TreeCollection.extend({
            initialize: function (props) {
                var that = this;
                that.rootURL = props.rootURL;
                that.childURL = props.childURL;
                that.id = props.id;
                that.url = that.rootURL;

                that.fetch({success: function (c, r) {
                    //pass
                }});
            }
        });

        // Tree View - Renders the tree
        var TreeView = Backbone.View.extend({
            //defaults
            collection : {},
            selectTag : "",
            el : "",
            selectedElement : "",

            initialize: function (props) {
                this.collection = props.coll;
                this.listenTo(this.collection, "reset", this.render);
                this.selectTag = props.selectTag;
                this.selectedElement = props.selectedElement;
                this.el = props.el;
                //workaround for select tag event
                $(this.selectTag).change({that: this}, this.selected);
                //initialize the tree with no data
                this.$el.tree({data: []});
                //fetch and render
                var that = this;
                this.collection.fetch({success: function () { that.render(); }});
            },

            render: function () {
                //get tree data
                var treedata = this.getTreeData();
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
                that.collection.update(
                    selected
                );
            }, // function called with the <select> tag selects something new

            collectionChanged : function (e) {
                var that = this;
                that.render();
            }, // function called when the collection is updated

            getTreeData : function () {
                var that = this;
                var data = [];
                var rootNodes = that.collection.where({parent_id: 0});
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

            treeSelect : function () {
                //console.log("Tree Select event caught");
            },

            treeOpen : function () {
                //console.log("Tree Open event caught");
            },

            treeClick : function (e) {
                //prevent the default selection
                e.preventDefault();

                //determine if the node is clickable
                var node = e.node;
                var id = e.node.id;
                var nodeArray = this.collection.where({id: id});
                var mappable = nodeArray[0].attributes.is_mappable;

                //select the node if mappable
                if (mappable) {
                    this.$el.tree('selectNode', node);
                    $(this.selectedElement).html(node.name);
                }
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

        var MapCollection = Backbone.Collection.extend({
            model: MapModel,

            //defaults 
            url: "",
            rooturl: "",
            statsURL: "",
            cse_id: 0,
            total_mappings: 0,

            initialize: function (props) {
                // constructor values
                this.cse_id = props.cse;
                this.rooturl = props.mapurl;
                this.setURL(this.cse_id);
                this.statsURL = props.statsURL;

                this.getStats(); //get the stats
            },

            setURL : function (id) {
                this.url = this.rooturl + id;
            },

            getStats: function (callback) {
                var that = this;
                var stats = $.getJSON(that.statsURL, function () {
                    that.total_mappings = stats.responseJSON.total_mappings;
                    if (typeof (callback) !== "undefined") {callback(); }
                }
                    );
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
                aRequest = that.collection.fetch({
                    success: function (c, r) {
                        that.pages = Math.floor((r.length / that.items_per_page)) + 1;
                        that.render();
                    }
                });
                requests.push(aRequest);

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
                spinner.spin(spintarget);
                aRequest = that.collection.fetch({
                    success: function (c, r) {
                        that.pages = Math.floor((r.length / that.items_per_page)) + 1;
                        that.render();
                        spinner.stop();
                    }
                });
                requests.push(aRequest);
            }
        });

        //*** DROPDOWN STRUCTURES
        var DropDownColl = Backbone.Collection.extend({
            initialize: function (props) {
                this.url = props.url;
                var that = this;

                this.fetch({success: function () {
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

            initialize: function () {
                $("#cseselect").change(this.choiceMade); //workaround for change event
                $("#catselect").change(this.choiceMade);
            },

            render: function () {
                var that = this;
                that.collection.fetch({
                    success: function () {
                        //***render the template***
                        var source = $("#selectTemplate").html();
                        var output = Mustache.render(source, that.collection.models);
                        $(that.el).html(output);
                    }
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
        var cseselectcoll = new DropDownColl({url: "../api/v1.0/cse"});
        var categoryselectcoll = new DropDownColl({url: "../api/v1.0/categories"});
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
            selectedElement: "#activeCSE"
        });
        var catTreeCollection = new CatTreeCollection({
            childURL: CATCHILDURL,
            rootURL: CATROOTURL,
            id: 1
        });
        var catview = new CatTreeView({
            coll : catTreeCollection,
            selectTag : "#catselect",
            el: "#cattree",
            selectedElement: "#activeCat"
        });
        var mapTreeCollection = new MapCollection({
            mapurl : MAPURL,
            statsURL : MAPSTATSURL,
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
            viewCseSelect.render();
            //cseview.render();
            //catview.render();
        });

        Backbone.history.start();
        $.when.apply($, requests).done(function () { spinner.stop(); } );

    });
}(jQuery, _));

/*var activeAJAX = 0;

Before making an AJAX call, activeAJAX++;

After completing an AJAX call (in the callback): if (--activeAJAX == 0) { allDone(); }
allDone = spinner.stop()
*/
