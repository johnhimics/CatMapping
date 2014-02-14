var AppRouter = Backbone.Router.extend({
	routes: {
		"": "root",
        "list" : "list",
        "categorystats" : "companyCategories",
        "category" : "yourCategories",
        "cse" : "cse",
		//Sample items
        "menu-items/new": "itemForm",
		"menu-items/:item": "itemDetails",
        //forcibly mapped node
        "http://johntestarea.x10.mx/otw/api/v1.0/category/?node=1&_=1390446278138" : "force"
	},

	root: function () {
		//$('#app').html('List screen');
        console.log("This is the root")
	},//http://johntestarea.x10.mx/otw/kuta/index.html

    list: function () {
        //target the "app" id and update the html
		$('#app').html('List screen');
	}, //http://johntestarea.x10.mx/otw/kuta/index.html#/list

	itemDetails: function (item) {
		$('#app').html('Menu item: ' + item);
	},

	itemForm: function () {
		$('#app').html('New item form');
	},
    
    cse: function() {
    //- Retrieves an array of CSE data for binding to the CSE selector.
        console.log("This is the companyCategories!");
    }, // http://johntestarea.x10.mx/otw/kuta/index.html#/cse

    companyCategories: function() {
    //- Retrieves statistics about the company category tree
        console.log("This is the categories!");
    }, // http://johntestarea.x10.mx/otw/kuta/index.html#/categorystats
    
    yourCategories: function() {
    //- Retrieves an array of categories for the "your categories" tree.
        console.log("This is the yourCategories!");
    }, // http://johntestarea.x10.mx/otw/kuta/index.html#/category
    
    force: function() {
        console.log("got it right");
        $.getJSON('../api/v1.0/cse',
            function(data) { return data; }); 
    }

});

var app = new AppRouter();

$(function() {
	Backbone.history.start();
});