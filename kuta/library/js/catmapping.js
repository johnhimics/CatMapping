$(function() {

    //Build the model for the list data
    var CategoryModel = Backbone.Model.extend( {
        
        defaults: function() {
            return {
               "parent_id" : -1,
               "id" : -1,
               "name" : "placeholder",
               "map-able" : true,
               "is-mapped" : false
               };}, //outline what attributes are in the model
               
    });
    
    //Build the collection for the categories
    var ListCollection = Backbone.Collection.extend( {
        
        model: CategoryModel,
        
        comparator : 'id', // meant to set the order
        
        initialize: function() {
            console.log("catergoyList init");
            //load the data for the tree
            //and make models out of it
        }
        
    });
    
    // create the global collection reference
    var categoryList = new ListCollection;
    
    var CategoryView = Backbone.View.extend({
        
        tagName: "div", // set the DOM element for a todo item

        events: {
            'tree.click' : 'TreeClickFunction'
            },
            
        TreeClickFuncton: function() {
            console.log("Tree has been clicked");
        },   
        
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);  //listenTo function.
            this.listenTo(this.model, 'destroy', this.remove); // listen to the events from the model
        }

        
    });    
            
})