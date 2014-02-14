/*Category mapping javascript
*
* Author: John Himics
* Email: J.Himics@gmail.com
*
*
*
*
*
*/

/*ROAD MAP
Collection for CATEGORY and CSE select tags
Collection for CATEGORT and CSE trees

View for CATEGORY and CSE select tags
View for CATEGORT and CSE trees

Event listening for select tags
Event listening for mapping button

Collection for mappings

Select tag event method

Variable declarations

Router for homepage rendering
*/

//***MODELS
var NodeModel = Backbone.Model.extend({

});

//***COLLECTIONS
$('document').ready( function() {

var DropDownColl = Backbone.Collection.extend({
  	initialize: function(props){
    	this.url = props.url;
    	var that = this;

    	this.fetch({success: function() {
		}})
	}

}); //Collection for the select tags

var TreeCollection = Backbone.Collection.extend({
  	model: NodeModel,
  	children: [],

  	initialize: function(props){
    	this.url = props.url;
    	var that = this;

    	this.fetch({success: function() {
		}})
	},

	addChild: function(parent_id){
		console.log("addChild called");
		var coll = new ChildCollection({
			parent_id: parent_id,
			baseurl: this.url
		});
		coll.fetch({success: function(){ 
			children.push(coll);
			console.log("child fetched");
		}});
	}
}); //Collection that houses collections and models,
	// represents the jqTrees (NOT USED YET)

var ChildCollection = Backbone.Collection.extend({
	//defaults
	parent_id: 0,
  	baseurl: "",
  	childurl: "",
  	url: "",
	children: [],

  	initialize: function(props){
    	this.baseurl = props.baseurl;
    	this.parent_id = props.parent_id;
    	this.childurl = props.childurl;
    	//this.url = this.baseurl + this.parent_id;
    	this.buildUrl(props.parent_id);
    	var that = this;
    	this.fetch({success: function() {
		}});
	},

	buildUrl: function(pid) {
		this.parent_id = pid;
		this.url = this.baseurl + this.parent_id;
	},

	addChild: function(parent_id, callback, view){
		var that = this;
		var coll = new ChildCollection({
			parent_id: parent_id,
			baseurl: this.childurl + this.parent_id + "/",
			childurl: this.childurl + this.parent_id + "/" //Attempt to set the next level of children urls
		});

		//console.log("new child's url");
		//console.log(coll.url);

		coll.fetch({success: function(){ 
			that.children.push(coll);
			console.log("child fetched");
			callback(view);
			//send an event to update the view
		}});
	}

}); //Collection for the jqTrees

//***VIEWS
var SelectView = Backbone.View.extend({

	attributes : function () {
	    return {
	      el : this.get('el'),
	      collection : this.get('collection'),
	      tvi : this.get('treeviewinstance')
	    };
  	}, //enable the constructor

	initialize: function() {

		//$("#cseselect").change(this.choiceMade(this, event)); //SET THE ONCHANGE EVENT
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

var TreeView = Backbone.View.extend({
	attributes : function () {
		console.log("Tree view constructor");
	    return {
	      el : this.get('el'),
	      collection : this.get('collection'),
	      el_select : this.get('el_select')
	    };
  	}, //enable the constructor

  	initialize: function() {
  		//event for the change in the collection, calls render
  		//console.log(this);
  		//this.listenTo(this.collection, "add", this.render);
	},

	render: function(context) {
		
		// set the context
		if(arguments[0]) {
			var that = context;
		} else {
			var that = this;
		}
		//console.log("Tree Render Function context");
		//console.log(that);

		that.treeUpdate();
	},

	events: {
		"tree.select" : "treeSelected"
	},

	treeSelected: function(event) {
		// console.log(this.options.el_select);
		//console.log(event);

		// Jquery DOM manipulation, can be worked into template.
		if (event.node) {
			$(this.options.el_select).html(event.node.name);
		} else {
			$(this.options.el_select).html("Nothing Selected");
		}

		// add the child subtree if not already loaded
		if (event.node && event.node.children.length === 0){
			var pid = event.node.id;
			//console.log("Attempting to add child for id:");
			//console.log(pid);
			//console.log(this.collection);
			this.collection.addChild(pid, this.render, this); };

		// print the collection children array for debugging
		console.log("collection children");
		console.log(this.collection.children);

	},

	treeUpdate: function() {
		
		var that = this;
		//console.log("treeUpdate function context");
		//console.log(that);
		
		//load current level
		that.collection.fetch({
			success: function(c, r) {
				//add the current level to the tree
				//Edit to choose only the mappable nodes
				$(that.el).tree({data: r});
				//$(that.el).tree('loadData', r);
				
				if (that.collection.length === 0) {
					//there are no children
					return;
				} else {
					//there are children
				}
			}
		});

 		//find selected node

 		//rebuild tree

 		//reselect the selected node

	}// recursive function that updates the tree data
}); //View that handles the jqTrees

var choiceMade = function(e) {
	//This is when the select tag is used
	console.log("choiceMade");
	console.log(e);
	console.log(e.target.name);
	/*console.log(event.target.selectedIndex); // find the index of the selected option
	console.log(event.target.options[event.target.selectedIndex].label);*/ //find the selected name (3 = index)
	var index = event.target.selectedIndex;
	var selectedName = event.target.options[index].label; 
	var sourcecoll = {};
	var destcoll = {};
	var view = {};
	if (e.target.name === "cseselect") {
		console.log("cse selected");
		sourcecoll = cseselectcoll;
		destcoll = csetreecoll;
		view = viewCseTree;
	} else {
		if (e.target.name === "catselect") {
			console.log("cat selected");
			sourcecoll = categoryselectcoll;
			destcoll = cattreecoll;
			view = viewCatTree;
		} else { console.log("error"); return false;}

	}
	console.log("collection:");
	console.log(sourcecoll);
	parent_id = sourcecoll.where({name : selectedName})
	parent_id = parent_id[0].get("id");
	console.log(parent_id);

	destcoll.buildUrl(parent_id);
	view.render();

	return true;
};

//***Variable Declarations
//Collections
var cseselectcoll = new DropDownColl({url: "../api/v1.0/cse"}); // constructor isn't working

var categoryselectcoll = new DropDownColl({url: "../api/v1.0/categories"}); // constructor isn't working

var csetreecoll = new ChildCollection({
	parent_id: 2,
	baseurl: "../api/v1.0/csecategories/",
	childurl: "../api/v1.0/csecategory/"
});

var cattreecoll = new ChildCollection({
	parent_id: 1,
	baseurl: "../api/v1.0/category/",
});

//Views

var viewCseTree = new TreeView({
	el: "#csetree",
	collection: csetreecoll,
	el_select: "#activeCSE"
});

var viewCatTree = new TreeView({
	el: "#cattree",
	collection: cattreecoll,
	el_select : "#activeCat"
});

var viewCseSelect = new SelectView({
	el : "#cseselect",
	collection : cseselectcoll,
	treeviewinstance: viewCseTree
});

var viewCatSelect = new SelectView({
	el: "#catselect",
	collection: categoryselectcoll,
	treeviewinstance: viewCatTree
});
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
    viewCseTree.render();
    viewCatTree.render();
});


Backbone.history.start(); 
})

/*RERFENCE

  THE <SELECT> TAG EVENTS THAT DIDN'T WORK
  		$(this.el).bind('change', "choiceMade");
		this.$el.bind('change', "choiceMade");
		$(this.el).bind('onchange', "choiceMade");
		this.$el.bind('onchange', "choiceMade");
		$(this.el).bind('click', "choiceMade");
		this.$el.bind('clicl', "choiceMade");
		$(this.el).bind('onclick', "choiceMade");
		this.$el.bind('onclick', "choiceMade");

		$(this.el).bind('change', function() {
			choiceMade();
		}); 
*/