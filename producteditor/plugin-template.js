// -*- coding: utf-8 -*-

/*
 plugin template

 Replace this text with a description of the plugin and what kind of
 product related data it edits.
 */


// A function closure is created in order to ensure dependencies are
// met and that the global namespace is not polluted.
(function (window, $, _, Backbone, PubSub, config) {

  // change bookPlugin to a suitable namespace name for this plugin
  var bookPlugin = {};

  /* It can be helpful to uncomment this line after changing the name
  to facilitate debugging*/
  // window.bookData = bookData;


  /* 
     The product editor uses a combination of backbone.js and PubSub
     to organize the code. For more information refer to:

     - backbone.js - http://backbonejs.org
     - PubSubJS    - https://github.com/mroderick/PubSubJS
  */

  /* Models */

  bookPlugin.Book = Backbone.Model.extend({

    // The base URL of the REST API webservice is provided by the
    // pedit namespace. Use it to build up a path to the model's
    // endpoint.
    url: pedit.APIURL + "/book",

    // Return nothing if the model is valid, otherwise return an error
    // message.
    validate: function (attrs, options) {
      if (typeof(attrs.ISBN) !== "string") {
        return "Missing required field ISBN";
      } else if (attrs.ISBN.length !== 9 &&
                 attrs.ISBN.length !== 10 &&
                 attrs.ISBN.length !== 13) {
        return "The ISBN provided is invalid.";
      }

      if (typeof(attrs.author) !== "string") {
        return "Missing or invalid required field author";
      }
    }
  });

  /* Views */
  bookPlugin.BookView = Backbone.View.extend({});


  /* Plugin */

  // This is the main object for the plugin. Use the constructor
  // function to create instances of the views and models necessary
  // for the plugin.
  bookPlugin.BookData = function () {
    this.book = new bookPlugin.Book();
    this.bookView = new bookPlugin.BookView({model: this.book});

    this.onEditProduct = $.proxy(this.onEditProduct, this);
    this.onSaveProduct = $.proxy(this.onSaveProduct, this);
  };

  bookPlugin.BookData.prototype.onEditProduct = function (productId) {
    this.book.set("productId", productId);
    this.book.fetch();
  };

  bookPlugin.BookData.prototype.onSaveProduct = function () {
    if (this.book.isValid()) {
      this.book.save();
    }
  };


  /* Editor Events */

  // Set up an instance of the main plugin object and subscribe to the
  // product editor's events
  PubSub.subscribe("editor.initialize", function (productId) {
    var plugin = new bookPlugin.BookData();
    PubSub.subscribe("editor.edit-product", plugin.onEditProduct);
    PubSub.subscribe("editor.save-product", plugin.onSaveProduct);

    // save a reference to the plugin so you can tear it down on
    // editor.destroy
    bookPlugin.plugin = plugin;
  });

  // call destroy on all of your views and set any references to any
  // models to null. Do your best to prevent memory leaks from
  // accumulating if the user has decided to edit many products in one
  // sitting.
  PubSub.subscribe("editor.destroy", function () {
    PubSub.unsubscribe(bookPlugin.plugin);
    bookPlugin.plugin.bookView.destroy();
    bookPlugin.plugin.book = null;
    delete bookPlugin.
    delete bookPlugin.plugin;
  });

}(window, $, _, Backbone, PubSub, config);
