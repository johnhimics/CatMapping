// -*- coding: utf-8 -*-

/*
 Basic Properties Plugin 

 This plugin handles the editing of the core product
 properties. producteditor.js must be included first in the page
 before this plugin is included.
*/


(function (window, pedit, Backbone, $, _, PubSub, config) {

  var basicProperties = {};

  // window.basicProperties = basicProperties;

  /* Models */

  basicProperties.BasicField = Backbone.Model.extend({
    url: function () {
      // /product/<int:product_id>/property/<string:key>
      var id = encodeURIComponent(this.get("productId")),
          key = encodeURIComponent(this.get("key"));
      return pedit.APIURL + "/product/" + id + "/property/" + key;
    }
  });


  basicProperties.BasicFieldCollection = pedit.Collection.extend({
    model: basicProperties.BasicField,

    initialize: function (productId) {
      this.productId = productId;
    },

    url: function () {
      var id = encodeURIComponent(this.productId);
      return pedit.APIURL + "/product/" + id + "/property";
    }
  });


  /* Views */

  basicProperties.BasicFieldView = Backbone.View.extend({
    tagName: "div",

    templates: {
      string: _.template(""),
      number: _.template(""),
      bool: _.template(""),
      date: _.template("")
    },

    initialize: function () {
      this.$el.addClass("row-fluid");
    },

    render: function () {
      var label = $("<label></label>"),
          input = $("<input></input>");
      label.text(this.model.get("key"));
      input.val(this.model.get("value"));
      this.$el.append(label, input);
      return this;
    }
  });


  basicProperties.BasicFieldsView = Backbone.View.extend({
    tagName: "div",

    attributes: {
      id: "basic-properties-tab"
    },

    initialize: function () {
      var tabId = "basic-properties-tab";
      this.$el
        .attr("id", tabId)
        .addClass("tab-pane");

      $("div.tab-content").append(this.el);

      $("#tabs-header")
        .append(
          "<li><a href=\"#" + tabId + "\" data-toggle=\"tab\">" +
            "Basic Properties</a></li>")
        .tab("show");

      $("#tab a:first").tab("show");

      this.childViews = [];
      this.listenTo(this.collection, "sync", this.render);
    },

    resetChildViews: function () {
      _(this.childViews).each(function (cv) {
        cv.destroy();
      });
      this.childViews = [];
    },

    render: function () {
      var self = this;
      this.resetChildViews();
      this.$el.html("");
      this.collection.each(function (p) {        
        var view = new basicProperties.BasicFieldView({model: p});
        self.$el.append(view.render().el);
      });
      return this;
    }
  });


  /* Plugin */

  // This is the main object for the plugin. Use the constructor
  // function to create instances of the views and models necessary
  // for the plugin.
  basicProperties.BasicProperties = function () {
    this.basicFields = new basicProperties.BasicFieldCollection();
    this.basicFieldsView = new basicProperties.BasicFieldsView({
      collection:this.basicFields
    });
    this.onEditProduct = $.proxy(this.onEditProduct, this);
    this.onSaveProduct = $.proxy(this.onSaveProduct, this);
  };

  basicProperties.BasicProperties.prototype.onEditProduct = function (msg, productId) {
    this.productId = productId;
    this.basicFields.productId = productId;
    this.basicFields.reset();
    this.basicFields.fetch();
  };

  basicProperties.BasicProperties.prototype.onSaveProduct = function () {
  };


  /* Editor Events */

  // Set up an instance of the main plugin object and subscribe to the
  // product editor's events
  PubSub.subscribe("editor.initialize", function (productId) {
    var plugin = new basicProperties.BasicProperties();
    PubSub.subscribe("editor.edit-product", plugin.onEditProduct);
    PubSub.subscribe("editor.save-product", plugin.onSaveProduct);

    // save a reference to the plugin so you can tear it down on
    // editor.destroy
    basicProperties.plugin = plugin;
  });

  // call destroy on all of your views and set any references to any
  // models to null. Do your best to prevent memory leaks from
  // accumulating if the user has decided to edit many products in one
  // sitting.
  PubSub.subscribe("editor.destroy", function () {
    PubSub.unsubscribe(basicProperties.plugin);
    this.basicFieldsView.destroy();
  });

}(window, pedit, Backbone, jQuery, _, PubSub, ADMINSITECONF));
