// -*- coding: utf-8 -*-

/*
 Product Editor 2 -- Now with backbone.js!

 This module implements the interface which allows the user to search
 for and select a product for editing. Actual editing of product data
 is delegated to product editor plugins. The core plugins are the
 basic properties plugin and the extended property plugin. To develop
 a new plugin start by making a copy of plugin-template.js, then
 review one of the core plugin implementations to see how the new
 plugin should be built.
 */

(function (window, $, _, Backbone, PubSub, config) {

  // Override PUT and DELETE requests with POST and add a special
  // X-HTTP-Method-Override header
  Backbone.emulateHTTP = true;

  var pedit = {
    APIURL: config.RESTAPIURL,
    DEFAULTPAGESIZE: 18,
    editorPlugins: {}
  };

  window.pedit = pedit;

  /* Models */

  pedit.Collection = Backbone.Collection.extend({
    url: function () {
      return pedit.APIURL + "/" + this.stem;
    },

    parse: function(resp, xhr) {
      return resp.results;
    }
  });

  pedit.Category = Backbone.Model.extend({
    toJqTreeNode: function () {
      return {
        id: this.get("id"),
        parentId: this.get("parentId"),
        label: this.get("name"),
        children: null
      };
    }
  });

  pedit.CategoryCollection = pedit.Collection.extend({
    stem: "categories",
    model: pedit.Category,

    toJqTreeData: function (parentId) {
      if (typeof(parentId) === "undefined") {
        parentId = 0;
      }

      var level = this.where({parentId: parentId}), data = [], node = null,
          self = this;

      _(level).each(function (m) {
        node = m.toJqTreeNode();
        node.children = self.toJqTreeData(m.get("id"));
        data.push(node);
      });

      return data;
    }
  });

  pedit.Pager = Backbone.Model.extend({
    url: pedit.APIURL + "/products/search",

    fetch: function () {
      var self = this;
      return Backbone.ajax({
        url: this.url,
        dataType: "json",
        data: $.param(this.toJSON()),
        success: function (data) {
          self.set("count", data.results);
        }
      });
    },

    parse: function(data, options) {
      return {pageNumber: 0, count: data.results};
    },

    getPageCount: function () {
      var count = this.get("count"), pageSize = this.get("pageSize");
      if (count % pageSize === 0) {
        return count / pageSize;
      } else {
        return Math.floor(count / pageSize) + 1;
      }
    }
  });


  pedit.SearchResult = Backbone.Model.extend({});
  pedit.SearchResultCollection = pedit.Collection.extend({
    stem: "products/search",
    model: pedit.SearchResult
  });


  pedit.Product = Backbone.Model.extend({

    url: function() {
      var base = pedit.APIURL + "/product";
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id;
    },

    parse: function (data, options) {
      return data.results;
    }

  });


  /* Views */


  /* The data for the treeview is pre-rendered into the page.*/
  pedit.TreeView = Backbone.View.extend({

    initialize: function () {
      var self = this;
      this.listenTo(this.collection, "reset", this.render);
      this.jqtree = this.$el.find(".jqtree");
      this.jqtree.bind("tree.select", function (event) {
        self.trigger("select", event.node.id);
      });
      this.$el.collapse();
      this.collapse();
    },

    render: function () {
      this.jqtree.tree({data: this.collection.toJqTreeData()});
    },

    expand: function () {
      this.$el.collapse("show");
    },

    collapse: function () {
      this.$el.collapse("hide");
    }

  });


  /* The search view keeps the pager model in sync with the user's selections
   * in the search box. Everytime anything changes, the pager's properties are
   * updated and if the user clicks the search button then the pager uses its
   * current properties to get a count of results from the server at which
   * point the search result view takes over. */
  pedit.SearchView = Backbone.View.extend({

    events: {
      "change select.domains"   : "updateDomain",
      "keyup input.query"       : "updateQuery",
      "click button.search"     : "search",
      "change input.adv-search" : "toggleAdvanced"
    },

    initialize: function () {
      this.treeView = new pedit.TreeView({
        collection: this.collection,
        el: this.$el.find(".treeview")
      });
      this.listenTo(this.treeView, "select", this.updateCategory);
      this.$el.find("input.adv-search").attr("checked", false);
      this.model.set("domainId", $("select.domains").val());
    },

    updateDomain: function (event) {
      var domainId = $(event.target).val();
      this.model.set("domainId", domainId);
    },

    updateQuery: function (event) {
      var query = $(event.target).val();
      this.model.set("query", query);
    },

    toggleAdvanced: function (event) {
      var val = $(event.target).is(":checked"),
          input = this.$el.find("input.query");
      this.model.set("skuOnly", !val);
      if (val) {
        input.prop("placeholder", input.attr("data-alt-placeholder"));
        this.treeView.expand();
      } else {
        input.prop("placeholder", input.attr("data-default-placeholder"));
        this.model.set("categoryId", -1);
        this.treeView.collapse();
      }
    },

    updateCategory: function (categoryId) {
      this.model.set("categoryId", categoryId);
    },

    search: function (event) {
      var $target = $(event.target), self = this;
      $target.spin(false).spin("small").attr("disabled", true);
      this.model.fetch({"countOnly": true}).always(function () {
        $target.spin(false).attr("disabled", false);
        self.trigger("search-complete");
      });
    }

  });

  pedit.SearchResultView = Backbone.View.extend({
    tagName: "tr",
    attributes: {"class": "search-result-row"},
    template: _.template("<td><%= sku %></td>" +
                         "<td><%= name %></td>" +
                         "<td><a target=\"_blank\" href=\"<%= url %>\">" + 
                         "<%= url %></td>"),
    events: {
      "click": "editProduct"
    },

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.attr("data-product-id", this.model.id);
      return this;
    },

    editProduct: function (event) {
      var productId = $(event.currentTarget).attr("data-product-id");
      this.trigger("edit-product", productId);
    }

  });


  pedit.SearchResultsView = Backbone.View.extend({

    initialize: function () {
      this.listenTo(this.collection, "request", this.spin);
      this.listenTo(this.collection, "sync error", this.stopSpin);
      this.listenTo(this.collection, "sync", this.render);
      this.$results = this.$el.find(".results");
    },

    removeChildViews: function () {
      var self = this;
      _(this.childViews).each(function (cv) {
        self.stopListening(cv);
        cv.remove();
      });
      this.childViews = [];
    },

    render: function () {
      var self = this;
      this.removeChildViews();
      this.$results.html("");
      this.collection.each(function (result) {
        var view = new pedit.SearchResultView({model: result});
        self.listenTo(view, "edit-product", self.editProduct);
        self.childViews.push(view);
        self.$results.append(view.render().el);
      });
      return this;
    },

    spin: function () {
      this.$el.spin(false).spin("large");
    },

    stopSpin: function () {
      this.$el.spin(false);
    },

    editProduct: function (productId) {
      this.trigger("edit-product", productId);
    }

  });

  pedit.PagerView = Backbone.View.extend({
    initialize: function () {
      this.listenTo(this.model, "change:count", this.onCountUpdated);
      this.listenTo(this.model, "change:pageNumber", this.render);
      this.listenTo(this.model, "request", this.onPagerRequest);
      this.$el.children("a").live("click", $.proxy(this.pageClicked, this));
      this.disabled = false;
      this.numberOfPages = 5;
    },

    onCountUpdated: function () {
      //this.$el.parent().spin(false);
      this.render();
    },

    onPagerRequest: function () {
      this.$el.parent().spin(false).spin("small");
      this.$el.html("");
    },

    render: function () {
      var pageCount = this.model.getPageCount(),
          pageNumber = this.model.get("pageNumber"),
          i = null, start = null, end = 0, cls = null,
          template =
            "<li style='cursor: pointer' " +
            "class='<%= cls %>'><a data-index='<%= idx %>'>" +
            "<%= label %></a></li>",
          midPoint = Math.floor(this.numberOfPages / 2);

      template = _.template(template);

      this.$el.html("");

      if (pageCount < this.numberOfPages + 1) {
        // just show as many buttons as there are pages
        for (i = 0; i < pageCount; ++i) {
          cls = pageNumber === i ? "active" : "";
          this.$el.append(template({idx: i, label: i+1, cls: cls}));
        }
      } else {
        // commence the fancy pagination
        if (pageNumber <= midPoint) {
          cls = pageNumber === 0 ? "disabled" : "";

          this.$el.append(template({
            idx: "first",
            label: "(1) <i class='icon-fast-backward'></i>",
            cls: cls
          }));

          this.$el.append(template({
            idx: "prev",
            label: "<i class='icon-backward'></i>",
            cls: cls
          }));

          for (i = 0; i < this.numberOfPages; ++i) {
            cls = pageNumber === i ? "active" : "";
            this.$el.append(template({idx: i, label: i+1, cls: cls}));
          }

          this.$el.append(template({
            idx: "forward-20%",
            label: "&hellip;",
            cls: ""
          }));

          this.$el.append(template({
            idx: "next",
            label: "<i class='icon-forward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "last",
            label: "<i class='icon-fast-forward'></i> (" + pageCount + ")</i>",
            cls: ""
          }));
        } else if (pageNumber > midPoint &&
                   pageNumber < pageCount - (midPoint + 1)) {
          this.$el.append(template({
            idx: "first",
            label: "(1) <i class='icon-fast-backward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "prev",
            label: "<i class='icon-backward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "backward-20%",
            label: "&hellip;",
            cls: ""
          }));

          start = pageNumber - midPoint;
          end = pageNumber + midPoint;
          for (i = start; i <= end; ++i) {
            cls = pageNumber === i ? "active" : "";
            this.$el.append(template({idx: i, label: i+1, cls: cls}));
          }

          this.$el.append(template({
            idx: "forward-20%",
            label: "&hellip;",
            cls: ""
          }));

          this.$el.append(template({
            idx: "next",
            label: "<i class='icon-forward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "last",
            label: "<i class='icon-fast-forward'></i> (" + pageCount + ")</i>",
            cls: ""
          }));
        } else {
          this.$el.append(template({
            idx: "first",
            label: "(1) <i class='icon-fast-backward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "prev",
            label: "<i class='icon-backward'></i>",
            cls: ""
          }));

          this.$el.append(template({
            idx: "backward-20%",
            label: "&hellip;",
            cls: ""
          }));

          for (i = pageCount-this.numberOfPages; i < pageCount; ++i) {
            cls = pageNumber === i ? "active" : "";
            this.$el.append(template({idx: i, label: i+1, cls: cls}));
          }

          cls = pageNumber === pageCount - 1 ? "disabled" : "";
          this.$el.append(template({
            idx: "next",
            label: "<i class='icon-forward'></i>",
            cls: cls
          }));

          this.$el.append(template({
            idx: "last",
            label: "<i class='icon-fast-forward'></i> (" + pageCount + ")</i>",
            cls: cls
          }));
        }
      }
    },

    pageClicked: function (event) {
      if (this.disabled) {
        return;
      }

      var el = event.target;

      if (el.tagName.toLowerCase() !== "a") {
        el = el.parentNode;
      }

      var idx = $(el).attr("data-index"),
          pageNumber = this.model.get("pageNumber"),
          pageCount = this.model.getPageCount(),
          view = this;

      if (idx === "first") {
        pageNumber = 0;
      } else if (idx === "last") {
        pageNumber = pageCount - 1;
      } else {
        if (idx === "prev" && pageNumber - 1 >= 0) {
          pageNumber -= 1;
        } else if (idx === "next" && pageNumber + 1 < pageCount) {
          pageNumber += 1;
        } else if (idx === "forward-20%") {
          pageNumber += Math.floor(pageCount * 0.2);
          if (pageNumber >= pageCount) {
            pageNumber = pageCount - 1;
          }
        } else if (idx === "backward-20%") {
          pageNumber -= Math.floor(pageCount * 0.2);
          if (pageNumber < 0) {
            pageNumber = 0;
          }
        } else {
          pageNumber = parseInt(idx, 10);
        }
      }
      this.model.set("pageNumber", pageNumber);
      this.disabled = true;

      var options = this.model.toJSON();
      options.countOnly = false;
      this.collection.fetch({data: options}).done(function () {
        view.disabled = false;
      });
    }

  });


  /* app */
  pedit.Editor = function (config) {
    var editor = this;
    _.extend(this, Backbone.Events);
    this.categories = new pedit.CategoryCollection();
    this.pager = new pedit.Pager({"pageSize": config.defaultPageSize,
                                  "pageNumber": 0,
                                  "domainId": -1,
                                  "categoryId": -1,
                                  "query": "",
                                  "skuOnly": true,
                                  "countOnly": true});
    this.searchResults = new pedit.SearchResultCollection();
    this.product = new pedit.Product();

    this.searchView = new pedit.SearchView({
      el: document.getElementById("search"),
      model: this.pager,
      collection: this.categories
    });

    this.searchResultsView = new pedit.SearchResultsView({
      model: this.pager,
      collection: this.searchResults,
      el: document.getElementById("results")
    });

    this.pagerView = new pedit.PagerView({
      model: this.pager,
      collection: this.searchResults,
      el: document.getElementById("productspager")
    });

    this.listenTo(this.searchView, "search-complete", function () {
      var options = this.pager.toJSON();
      options.countOnly = false;
      this.searchResults.fetch({data: options});
    });

    this.listenTo(
      this.searchResultsView, "edit-product", function (productId) {
        console.log("edit product " + productId);
        this.product.set("id", productId);
        this.product.fetch();
        $("#editor-tab").tab("show");
        PubSub.publish("editor.edit-product", productId);
      });

    PubSub.publish("editor.initialize");
  };

  pedit.Editor.prototype.destroy = function () {
    this.searchView.destroy();
    this.searchResultsView.destroy();
    PubSub.publish("editor.destroy");
  };

  $(function () {
    var editor = new pedit.Editor({defaultPageSize: pedit.DEFAULTPAGESIZE});
    editor.categories.reset(JSON.parse($("#category-data").text()));
    pedit.editor = editor;
  });

  PubSub.subscribe("editor", function (msg, data) {
    console.log("published: " + msg);
    console.log("    " + JSON.stringify(data));
  });

}(window, jQuery, _, Backbone, PubSub, ADMINSITECONF));
