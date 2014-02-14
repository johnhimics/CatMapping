/* Category mapping javascript
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

Router for homepage rendering
*/

//***COLLECTIONS
$('document').ready( function() {

var ParentCollection = Backbone.Collection.extend({
	/*options : function () {
	    return {
	      url : this.get('url')
	    };
  	},*/
  	initialize: function(props){
    	this.url = props.url;
    	var that = this;

    	this.fetch({success: function() {
		}})
	}

}); //Collection for the select tags

var childCollection = Backbone.Collection.extend({
	parent_id: 0,
	/*attributes : function () {
	    return {
	      url : this.get('url'),
	      parent_id : this.get('parent_id')
	    };
  	},*/
  	initialize: function(props){
    	this.baseurl = props.baseurl;
    	this.parent_id = props.parent_id;
    	this.url = this.baseurl + this.parent_id;
    	var that = this;
    	this.fetch({success: function() {
		}});
	}
}); //Collection for the jqTrees

//***VIEWS
var SelectView = Backbone.View.extend({
	attributes : function () {
	    return {
	      el : this.get('el'),
	      collection : this.get('collection'),
	      tvi : this.get('treevieinstance')
	    };
  	}, //enable the constructor

	initialize: function() {

		$("#cseselect").change(this.choiceMade); //SET THE ONCHANGE EVENT

		console.log(this.$el);
	},

	render: function() {
		console.log("select render function");
		var that = this;
		that.collection.fetch({
			success: function() {
				//***render the template***
				var source = $("#selectTemplate").html();
				var output = Mustache.render(source, that.collection.models);
			}
		})
	},

	events: {
		// onchange event wouldn't work here
	},

	choiceMade: function(event) {
		//This is when the select tag is used
		console.log(event);
		console.log(event.target.selectedIndex); // find the index of the selected option
		console.log(event.target.options[3].label); //find the selected name (3 = index)
		var index = event.target.selectedIndex;
		var selectedName = event.target.options[index].label;
		console.log(collection.models[index]);
		//tvi.updateTree(selectedName);
	}

}); // view that handles the select tags

var TreeView = Backbone.View.extend({
	attributes : function () {
	    return {
	      el : this.get('el'),
	      collection : this.get('collection'),
	      el_select : this.get('el_select')
	    };
  	}, //enable the constructor

  	initialize: function() {
  		//pass
	},

	render: function() {
		var that = this;
		that.collection.fetch({
			success: function(c, r) {
				//render the tree
				//Edit to choose only the mappable nodes
				$(that.el).tree({data: r});
			}
		})
	},

	events: {
		"tree.select" : "treeSelected"
	},

	treeSelected: function(event) {
		// console.log(this.options.el_select);
		 console.log(event);

		if (event.node) {
			$(this.options.el_select).html(event.node.name);
		} else {
			console.log(this);
			$(this.options.el_select).html("Nothing Selected");
		}
	},

	updateTree : function(name) {

	}
}); //View that handles the jqTrees

//***Variable Declarations
//Collections
var cseselectcoll = new ParentCollection({url: "../api/v1.0/cse"}); // constructor isn't working

var categoryselectcoll = new ParentCollection({url: "../api/v1.0/categories"}); // constructor isn't working

var csetreecoll = new childCollection({
	parent_id: 2,
	baseurl: "../api/v1.0/csecategories/"
});

var cattreecoll = new childCollection({
	parent_id: 2,
	baseurl: "../api/v1.0/category/"
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
	treevieinstance: viewCseTree
});

var viewCatSelect = new SelectView({
	el: "#catselect",
	collection: categoryselectcoll,
	treevieinstance: viewCatTree
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