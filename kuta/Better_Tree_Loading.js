var pedit = {};

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

pedit.TreeView = Backbone.View.extend({

  initialize: function () {
    var self = this;
    this.listenTo(this.collection, "sync", this.render);
    this.$el.bind("tree.select", function (event) {
      self.trigger("select", event.node.id);
    });
    this.isLoaded = false;
  },

  render: function () {
    var data = this.collection.toJqTreeData();
    this.$el.tree({data: data});
    this.isLoaded = true;
  }

});