/*jslint vars: true */
/*Category mapping javascript
 *
 * Author: John Himics
 * Email: J.Himics@gmail.com
 * Version: 0.5
 * 
 * 
 *
 *
 * NOTES:   Every CSE has enable_tree_mappings = false ??
 *          
 * 
 */

/*jslint nomen: true */
/*jslint browser: true*/
/*jslint vars: true */
/*jslint indent: 4 */
/*globals $, jQuery, _, Backbone, console, Mustache, Spinner*/

/* This closure keeps your globals from leaking into the global
 * namespace but still makes them available to all of the code in the
 * app. */
(function ($, _) {
    //"use strict";
    //EMULATE HTTP AND JSON
    Backbone.emulateHTTP = true;

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

    var spintarget = document.getElementById('spinnerDIV');
    var spinner = new Spinner(opts);
    spinner.spin(spintarget);
    // GLOBAL VARIABLES
    var LAZYLOADINGTHRESHHOLD = 20, CHILDPAGINGTHRESHHOLD = 6, CHILDPAGESIZE = 5;

    // **TODO: rework the way URLs are configured. Utilise the URL
    // attribute as a function technique from Backbone to facilitate
    // configuration
    // FOR THE SERVER
    var APIROOT = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/";
    var CSEROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategories/",
        CSECHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategory/",
        CSESTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/csecategorystats/",
        CATROOTURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/categories",
        CATCHILDURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/category/",
        CATSTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/categorystats",
        MAPSTATSURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mappingstats/", //<cse_id::integer> GET
        MAPURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/mappings/", //<cse_id::integer> GET or POST or DELETE
        DROPDOWNURL = "http://channelmanager.espsoftware.com/newadmin/api/v1.0/cse";

    /* This is the preferred onDocumentReady syntax for jQuery at the moment. */
    $(function () {


        // add this to your namespace and have all of your collections inherit from it
        var JSON_HANDLER_COLLECTION = Backbone.Collection.extend({
            APIURL: "http://channelmanager.espsoftware.com/newadmin/api/v1.0/",
            stem: "",
            statsstem: "",

            parse: function (resp) {
                if (typeof (resp.results) !== "undefined") {
                    return resp.results;
                } else if (typeof (resp.result) !== "undefined") {
                    return resp.result;
                } else {
                    return resp;
                }
            },

            //beginnings of a URL handler
            url: function () {
                return this.APIURL + "/" + this.stem;
            },

            statsURL: function () {
                return this.APIURL + "/" + this.statsstem;
            }
        });
        //*** TREE STRUCTURES

        //DataModel - represents each node
        var TreeNode = Backbone.Model.extend({
            //defaults
            parent_id: 0,
            id: 0,
            name: "",
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
                var that = this;
                // constructor values
                that.rootURL = props.rootURL;
                that.childURL = props.childURL;
                that.statsURLroot = props.statsURL;
                that.statsURL = that.statsURLroot + that.id;
                that.id = props.id;
                that.url = that.rootURL + that.id;
                that.lazyLoadEnabled = that.TOTALNODES > LAZYLOADINGTHRESHHOLD;
                that.childPagingEnabled = (that.lazyLoadEnabled &&
                                          that.MAXCHILDNODES > CHILDPAGINGTHRESHHOLD);
            },

            update: function (id) {
                var that = this;
                that.id = id;
                that.url = that.rootURL + that.id;
                that.statsURL = that.statsURLroot + that.id;
                that.page_num = 0;
                that.reset(null, {silent: true}); //empty the collection
                that.getStats();
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
                        }

                        that.load(null, 0);
                    })
                    .fail(function () {
                        that.TOTALNODES = 1;
                        that.MAXCHILDNODES = 1;
                        that.load();
                    });
            },

            load: function (id, pagenum) {
            //Determines how to call the lazyload function.
                var that = this;

                //debugging
                /*lazyLoadEnabled = false;
                childPagingEnabled = true;*/

                var xhr;
                if (that.lazyLoadEnabled) {
                    if (typeof(id) === "number" && id !== 0) {
                        //There is an id specified, load that node's children
                        if (that.childPagingEnabled) {
                            //paging, load child one page at a time
                            xhr = that.lazyload(pagenum, that.page_size, id)
                                .done( function () {
                                that.trigger("add", xhr);
                            });
                        } else {
                            //no paging, load all children
                            xhr = that.lazyload(null, null, id)
                                .done( function () {
                                that.trigger("add", xhr);
                            });
                        }
                    } else {
                        // no ID specified, load the root nodes
                        xhr = that.lazyload(pagenum, that.page_size, 0)
                        .done( function () {
                            that.trigger("add");
                        });
                    }
                } else {
                    if (typeof(id) === "number") {
                        //do nothing, clicked node is without children
                    } else {
                        // Load the entire tree
                        xhr = that.lazyload()
                            .done( function () {
                                that.trigger("reset");
                            });
                    }
                }
                
                return xhr;
            }, //Implementation of lazy loading

            lazyload: function (page_number, page_size, parent_id) {
                var that = this;
                var xhr;
                spinner.spin(spintarget);
                xhr = that.fetch(
                    {remove: false,
                        silent: true,
                        data: {
                            page_number: page_number,
                            page_size: page_size,
                            parent_id: parent_id
                        }}
                )
                    .always(function () {
                        spinner.stop();
                    })
                
                return xhr;
            }
        });

        var CatTreeCollection = TreeCollection.extend({
            
            initialize: function (props) {
                var that = this;
                // constructor values
                that.id = props.id;
                that.rootURL = props.rootURL;
                that.childURL = props.childURL;
                that.statsURL = props.statsURL;
                that.url = that.rootURL;
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
                this.listenTo(this.collection, "add", this.render);
                this.listenTo(this.collection, "sync", this.syncRender);
                $(this.loadButton).click({that: this}, this.loadMoreRoot);
                $(this.selectTag).change({that: this}, this.selected);
                //initialize the tree with no data
                this.$el.tree({data: []});
                
                //load the collection
                var that = this;
                that.collection.getStats();
            },

            render: function (resp) {
                var treedata = this.getTreeData();
                this.$el.tree('loadData', treedata);
            },

            events: {
                "tree.select" : "treeSelect",
                "tree.open" : "treeOpen",
                "tree.click" : "treeClick",
                "tree.close" : "treeClose"
            },

            selected : function (e) {
                var that = e.data.that;
                var selected = e.target.value;
                that.collection.update(selected);
            }, // function called with the <select> tag selects something new

            collectionChanged : function (e) {
                var that = this;
                this.collection.page_num = 0; //reset page number so lazy loading starts over
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
                        // Add a placeholder child if there are no children.
                        if (root.children.length === 0) {
                            root.children = [{"label" : " ",
                                             "id": -1 }];
                        }
                        
                        data.push(root);
                    }, that);
                    // add a "Load More" child if lazy loading is enabled
                    if(that.collection.lazyLoadEnabled === true) {
                        data.push({"label" : "Load More",
                                               "id": -2 });
                    }
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
                        // Add a placeholder child if there are no children.
                        if (child.children.length === 0) {
                            child.children = [{"label" : " ",
                                             "id": -1 }];
                        }
                        data.push(child);
                    }, that);

                if(that.collection.childPagingEnabled === true) {
                    data.push({"label" : "Load More",
                                           "id": -3 });
                }
                return data;
            }, // recursive function to build tree data

            treeSelect : function (e) {
                e.preventDefault();
                var node = e.node;
                if (node !== null) {
                    $(this.selectedElement).html(node.name);
                } else {
                    $(this.selectedElement).html("Nothing Selected");
                }
            },

            treeOpen : function (e) {
                e.preventDefault();
                this.treeClick(e);
            },
            
            treeClose : function () {
            },

            treeClick : function (e) {
                //prevent the default selection
                e.preventDefault();
                var that = this;
                var node = e.node;
                var id = e.node.id;

                //select the node?
                if (that.$el.tree('getSelectedNode') === node) {
                    that.$el.tree('selectNode', null);
                } else {
                    //that.$el.tree('openNode', node);
                    that.$el.tree('selectNode', node);
                }
                
                var loadChildren = false;

                if (node.children.length === 1) {
                    // only has one child, check if it's the placeholder
                    if (node.children[0].id === -1) {
                        // it IS the placeholder, try to load the children
                        loadChildren = true;
                    } else if (node.children[0].id === -3) {
                        // it IS the placeholder, try to load the children
                        loadChildren = true;
                    }
                } else {
                    // try to load more children
                    if (that.collection.childPagingEnabled === true) {
                        loadChildren = true;
                    }
                }

                //if the load more child, then load more!
                if (id === -2) {
                    e.data = {};
                    e.data= {that: that};
                    that.loadMoreRoot(e);
                    that.$el.tree('selectNode', null);
                } else if (id === -3) {
                    node = node.parent;
                    id = node.id;
                    loadChildren = true;
                    that.$el.tree('selectNode', null);
                }

                if (loadChildren) {
                    that.$el.tree('openNode', node);
                    var state = that.$el.tree('getState');
                    var pagenum = Math.floor(node.children.length / that.collection.page_size);
                    that.collection.load(id, pagenum)
                        .done( function () {
                            //restore the tree state
                            that.$el.tree('setState', state);
                            if(arguments[0].results.length < that.collection.page_size) {
                                //delete the "load more" node
                                //find the node
                                var delnode = _.where(that.$el.tree('getTree').children, {name: node.name});
                                    delnode = _.where(delnode[0].children, {name: "Load More"});
                                that.$el.tree('removeNode', delnode[0]);
                            }
                        });
                }
            },
            
            loadMoreRoot : function (e) {
                var thatview = e.data.that;
                thatview.collection.page_num += 1;
                var pagenum = Math.floor(thatview.collection.where({parent_id: 0}).length / thatview.collection.page_size)
                                        //(id, context)
                thatview.collection.load(0, pagenum);
            }
        });

        var CatTreeView = TreeView.extend({

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
            id: this.cse_id,
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
                spinner.spin(spintarget);
                var stats = $.getJSON(that.statsURL)
                    .always(function () {
                        spinner.stop();
                    })
                    .done(function () {
                        that.total_mappings = stats.responseJSON.total_mappings;
                        if (typeof (callback) !== "undefined") {callback(); }
                    })
                    .fail(function () {
                        that.total_mappings = 0;
                        if (typeof (callback) !== "undefined") {callback(); }
                    });
                    
            },
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
                $(this.button).click({that: this}, this.MapThisButtonClick); //Mapping Button
                $(this.selectTag).change({that: this}, this.collectionChanged); //select tag
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
                            }
                            var catname = "";
                            placeholder = that.cat.collection.where({id: parseInt(catid, 10)})[0];
                            if (typeof (placeholder) !== "undefined") {
                                catname = placeholder.attributes.name;
                            } else {
                                catname = "Name Undefined";
                            }

                            var nameObj = {csecategory_id: cseid,
                                       cse_id: model.get("cse_id"),
                                       yourcategory_id: catid,
                                       cse_name: csename,
                                       cat_name: catname
                                       };
                            names.push(nameObj);
                        }
                    );
                var tableData =
                    {data : names,
                        pages : pages,
                        btnclick: that.paginationBtnClick };

                var output = Mustache.render(source,
                    tableData,
                    ((this.page) * this.items_per_page));
                $(that.el).html(output);

                //map the buttons
                that.$el.off("click", '#PageButton', that.paginationBtnClick);
                that.$el.on("click", '#PageButton', {page: -1, that: that},
                                    that.paginationBtnClick);
                $('#btnnext').click({page: 'next', that: that},
                                    that.paginationBtnClick);
                $('#btnprev').click({page: 'prev', that: that},
                                    that.paginationBtnClick);
                //map the delete links
                that.$el.off("click", '#DeleteLink', that.deleteLinkClicked);
                that.$el.on("click", '#DeleteLink', {that: that}, that.deleteLinkClicked);
            },

            deleteLinkClicked : function (e) {
                var that = e.data.that;
                var model = that.collection.findWhere({csecategory_id: parseInt(e.currentTarget.dataset.cse),
                    yourcategory_id: parseInt(e.currentTarget.dataset.cat)});
                model.destroy({success: function(delmodel, response) {
                    that.collection.sync("delete", model, {url: that.collection.url,
                                                        data: JSON.stringify(model.toJSON())});
                }});
            },

            paginationBtnClick : function (e) {
                var that = e.data.that;
                if (e.data.page === 'next') {
                    if ((that.page + 1) <= that.pages) {that.page = that.page + 1; } //replace with num of pages
                } else if (e.data.page === 'prev') {
                    if ((that.page - 1) >= 1) {that.page = that.page - 1; } //replace with num of pages
                } else {
                    that.page = parseInt(e.currentTarget.innerHTML, 10);
                }
                that.render();
            },

            MapThisButtonClick : function (e) {
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

            collectionChanged : function (e) {
                // fires when the cse collection has been reset (dropdown used)
                var that;
                if(typeof(e) !== "undefined") {
                    that = e.data.that;
                } else {
                    that = this;
                }
                that.collection.reset(null, {silent: true});
                that.collection.setURL(that.cse.collection.id);
                spinner.spin(spintarget);
                that.collection.getStats(function () {
                    that.collection.fetch()
                    .always(function () {
                        
                    })
                    .done(function (c, r) {
                        that.pages = Math.floor((r.length / that.items_per_page)) + 1;
                        that.render();
                    })
                    .fail(function () {
                        spinner.stop();
                        that.pages = 1;
                        that.render();
                    });
                });
            },
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
                    .done(function () {
                        //***render the template***
                        var source = $("#selectTemplate").html();
                        var output = Mustache.render(source, that.collection.models);
                        $(that.el).html(output);
                    })
                    .fail(function () {
                        //Select Box fetch failed
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
        window.cseTreeCollection = cseTreeCollection;
        
        var cseview = new TreeView({
            coll : cseTreeCollection,
            selectTag : "#cseselect",
            el: "#csetree",
            selectedElement: "#activeCSE",
            selectCollection: cseselectcoll,
            loadButton: "#LoadMoreCSE"
        });
        window.cseview = cseview;
        
        var catTreeCollection = new CatTreeCollection({
            childURL: CATCHILDURL,
            rootURL: CATROOTURL,
            statsURL: CATSTATSURL,
            id: 1
        });
        window.catTreeCollection = catTreeCollection;
        
        var catview = new CatTreeView({
            coll : catTreeCollection,
            el: "#cattree",
            selectedElement: "#activeCat",
            loadButton: "#LoadMoreCAT"
        });
        window.catview = catview;
        
        var mapTreeCollection = new MapCollection({
            mapurl : MAPURL,
            rootStatsURL : MAPSTATSURL,
            cse: 2
        });
        window.mapTreeCollection = mapTreeCollection;
        
        var mapView = new MapView({
            el : "#MappingTable",
            collection : mapTreeCollection,
            button : "#mappingButton",
            cse : cseview,
            cat : catview,
            selectTag : "#cseselect"
        });
        window.mapView = MapView;
        

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
            viewCseSelect.render();
        });

        Backbone.history.start();

    });
}(jQuery, _));
