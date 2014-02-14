/*Category mapping javascript
*
* Author: John Himics
* Email: J.Himics@gmail.com
* Version: 0.3
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
// GLOBAL VARIABLES
var LAZYLOADINGTHRESHHOLD = 3000, CHILDPAGINGTHRESHHOLD = 100, CHILDPAGESIZE = 25; 
var CSEROOTURL = "../api/v1.0/csecategories/";
var CSECHILDURL = "../api/v1.0/csecategory/";
var CATROOTURL = "";
var CATCHILDURL = "";

$('document').ready( function() {

//*** TREE STRUCTURES
//DataModel - reprsents each node
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
var TreeColl = Backbone.Collection.extend({
	model: TreeNode,
	//defaults
	rootURL: "",
	childURL: "",
	url: this.rootURL,
	id: 2,


	initialize: function(props) {
		var that = this;
		that.rootURL = props.rootURL;
		that.childURL = props.childURL;
		that.id = props.id,
		that.url = that.rootURL + that.id;

		/*console.log("TreeColl init");
		console.log("Child Url")
		console.log(that.childURL);
		console.log("Root Url");
		console.log(that.rootURL);
		console.log(that.url);*/

		that.fetch({success: function(c, r) {
			//pass
		}});
	},

	update: function(id, callback) {
		var that = this;
		that.id = id;
		that.url = that.rootURL + that.id;
		that.reset(); //to fire the reset event. empties the collection
	}
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
	},

	render: function() {
		//pass
		//get tree data
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
		that.collection.update(selected, 
								function() {
									console.log("callback successful!"); //test callback, can be removed
							})
	}, // function called with the <select> tag selects something new

	collectionChanged : function(e) {
		var that = this;
		that.collection.fetch({success: function(c, r) {
			that.render();
		}})
	}, // function called when the collection is updated

	getTreeData : function() {
		var that = this;
		var data = [];
		var rootNodes = that.collection.where({parent_id: 0})
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
		var childNodes = that.collection.where({parent_id: parent_id})
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
		}})
	}
}); //Collection for the select tags

var SelectView = Backbone.View.extend({

	attributes : function () {
	    return {
	      el : this.get('el'),
	      collection : this.get('collection'),
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
		})
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
/*	console.log("choiceMade");
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
	collection : cseselectcoll,
});
var viewCatSelect = new SelectView({
	el: "#catselect",
	collection: categoryselectcoll,
});

//CSE Tree variables
var csetreecoll = new TreeColl({
	childURL: CSECHILDURL,
	rootURL: CSEROOTURL,
	id: 2
})

var cseview = new TreeView({
	coll : csetreecoll,
	selectTag : "#cseselect",
	el: "#csetree"
})


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
    viewCatSelect.render();
    viewCseSelect.render();
});


Backbone.history.start(); 
})