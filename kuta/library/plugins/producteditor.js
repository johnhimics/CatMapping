/* Product Editor */
(function () {
  //var URLBASE = "/newadmin"; // production
  var URLBASE = ""; // dev

  if ( ! window.console ) console = { log: function(){} };

  productEditor = {
    cacheTimeout: 7200000 /* two hours in milliseconds */
  };

  /* database module */
  (function () {

    productEditor.saveDatabase = function() {
      console.log("DEBUG: Generating JSON data.");
      var json = JSON.stringify(productEditor.database), compressed_json;

      console.log("DEBUG: Compressing JSON data size=" + json.length.toString());
      LZMA.compress(
	json, 1,
	function (compressed_json) {
	  var i = 0, op = "";

	  for (i = 0;i < compressed_json.length; i++) {
	    op += String.fromCharCode(compressed_json[i]);
	  }

	  try {
	    localStorage["producteditor.database"] = op;
	    console.log("DEBUG: database persisted to localStorage");
	  } catch(e) {
	    console.log("DEBUG: failed to cache data! (was probably too big)," +
			" clearing cache and trying again.");

	    try {
	      localStorage["producteditor.database"] = compressed_json;
	    } catch(e) {
	      console.log("DEBUG: failed to cache data on retry, giving up.");
	    }
	  }
	},
	function (percent) {
	  console.log("DEBUG: Compressing database %" + (percent * 100).toString());
	});

    };

    productEditor.getCategories = function (companyId) {
      var timestamp = parseInt(productEditor.database.categoryTimestamp, 10),
      delta = (new Date()).getTime() - timestamp, dfd;

      if (delta > productEditor.cacheTimeout) {
	console.log("DEBUG: Category cache timed out, retrieving fresh taxonomy.")
	dfd = $.ajax({
	  url: URLBASE + "/api/company/" + companyId + "/categories",
	  dataType: "json"
	}).done(function(categories) {
	  productEditor.database.categories = categories;
	  productEditor.database.categoryTimestamp = (new Date()).getTime().toString();
	  productEditor.saveDatabase();
	});
      } else {
	console.log("DEBUG: Retrieving categories from cache.");
	dfd = $.Deferred();
	dfd.resolve(productEditor.database.categories);
      }

      return dfd;
    };

    productEditor.getProducts = function (companyId, categoryId) {
      var cached = false, timestamp, delta, dfd,
      url = URLBASE + "/api/company/" + companyId.toString() +
	"/products/" + categoryId.toString();

      if (categoryId in productEditor.database.products) {
	timestamp = parseInt(productEditor.database.products[categoryId].timestamp, 10);
	delta = (new Date()).getTime() - timestamp, dfd;
	cached = delta < productEditor.cacheTimeout;
      }

      if (!cached) {
	console.log("DEBUG: Products not cached or stale, retrieving fresh product set.")
	dfd = $.ajax({
	  url: url,
	  dataType: "json"
	}).done(function(categories) {
	  productEditor.database.products[categoryId] = {
	    products: categories,
	    timestamp: (new Date()).getTime().toString()
	  };
	  productEditor.saveDatabase();
	});
      } else {
	console.log("DEBUG: Retrieving products from cache.");
	dfd = $.Deferred();
	dfd.resolve(productEditor.database.products[categoryId].products);
      }

      return dfd;
    };

    productEditor.getProduct = function (productId) {
      console.log("DEBUG: Looking up product " + productId);
      var dfd = $.Deferred(), i, cat_list, prod = null;
      for (key in productEditor.database.products) {
	if (productEditor.database.products.hasOwnProperty(key)) {
	  cat_list = productEditor.database.products[key].products;
	  for (i = 0; i < cat_list.length; i++) {
	    if (cat_list[i].id == productId) {
	      prod = cat_list[i];
	      break;
	    }
	  }
	}
	if (prod !== null) {
	  break;
	}
      }
      if (prod === null) {
	console.log("WARNING: Product not found!");
      }
      dfd.resolve(prod);
      return dfd;
    };

    productEditor.saveProduct = function(product) {
      throw "Not implemented";
    };

    productEditor.freshStart = function () {
      productEditor.database = {
	"categoryTimestamp": new Date(
	  new Date().getTime() -
	    (productEditor.cacheTimeout + 1)).getTime(),
	"categories": [],
	"products": {}
      };
      productEditor.saveDatabase();
    };

    productEditor.getRakutenAttributes = function(companyId, productId) {
      var url = URLBASE + "/api/company/" + companyId.toString() +
	"/product/" + productId.toString() + "/rakutenattributes", dfd;

      console.log("DEBUG: Retrieving Rakuten product attributes.");
      dfd = $.ajax({
	url: url,
	dataType: "json"
      }).done(function(attributes) {
	console.log("DEBUG: Finished retrieving Rakuten product attributes.");
      });

      return dfd;
    };

    productEditor.saveDefaultProperty = function (companyId, key, value) {
      var url = URLBASE + "/api/company/" + companyId.toString() +
	"/defaultproperty", dfd;

      console.log("DEBUG: Setting default product property.");
      dfd = $.ajax({
	url: url,
	data: {"key": key, "value": value},
	type: "POST",
	dataType: "json"
      }).done(function(attributes) {
	console.log("DEBUG: Finished setting default product property.");
      });

      return dfd;
    };

    productEditor.saveDefaultAttribute = function (companyId, attributeId, value) {
      var url = URLBASE + "/api/company/" + companyId.toString() +
	"/defaultrakutenattribute", dfd;

      console.log("DEBUG: Setting default Rakuten attribut.");
      dfd = $.ajax({
	url: url,
	data: {"attributeId": attributeId, "value": value},
	type: "POST",
	dataType: "json"
      }).done(function(attributes) {
	console.log("DEBUG: Finished setting default Rakuten attribute.");
      });

      return dfd;
    };

  }());

  /* UI module */
  (function () {
    productEditor.updateCategoryTree = function () {
      var companyId = $("#categorytree").attr("data-company-id");
      $("#categories").spin();
      productEditor
	.getCategories(companyId)
	.done(function (categories) {
	  $("#categories").spin(false);
	  $("#categorytree").tree("loadData", categories);
      });
    };

    productEditor.updatePager = function (products) {
      var $pl = $("#productlist"),
      productsPerPage = parseInt($pl.attr("data-products-per-page"), 10),
      currentPage = parseInt($pl.attr("data-current-page"), 10),
      markup = "",
      i = 0;

      for(i = 0; i < products.length / productsPerPage; i++) {
  	if (i === currentPage) {
  	  markup +=  "<li class='active'><a href='#page_" + i.toString() +
  	    "'>" + i.toString() + "</a></li>";
  	} else {
  	  markup +=  "<li><a href='#page_" + i.toString() +
  	    "'>" + i.toString() + "</a></li>";
  	}
      }

      $("#productpager").html(markup);
    };

    productEditor.showProducts = function (products) {
      var $pl = $("#productlist"), i, markup = "",
      productsPerPage = parseInt($pl.attr("data-products-per-page"), 10),
      currentPage = parseInt($pl.attr("data-current-page"), 10),
      minIndex = Math.min((currentPage * productsPerPage), products.length),
      maxIndex = Math.min(minIndex + productsPerPage, products.length);

      for(i = minIndex; i < maxIndex; i++) {
  	markup += "<tr><td><a href='#" + products[i].id + "'>"
  	  + products[i].sku + "</a></td></tr>";
      }
      $pl.find("tbody").html(markup);
    };

    productEditor.uploadProduct = function(product) {
      console.log("DEBUG: Uploading product data");
      var companyId = $("#productlist").attr("data-company-id"),
      dfd = $.ajax({
	url: URLBASE + "/api/company/" + companyId + "/product/" + product.id + "/save",
	data: {"product_data": JSON.stringify(product)},
	type: "POST",
	dataType: "json"
      });

      return dfd;
    };

  }());


  /* on DOM ready */
  $(function () {
    $("#categorytree")
      .tree()
      .bind(
  	"tree.click",
  	function(event) {
  	  var nodes = $("#categorytree").tree("getSelectedNodes");
  	  $(nodes).each(function(index, node) {
  	    $("#categorytree").tree("removeFromSelection", node);
  	  });

  	  $(".jqtree-selected").removeClass("jqtree-selected");
  	})
      .bind(
  	"tree.select",
  	function(event) {
  	  if (event.node) {
  	    $("#results").spin();
  	    var categoryId = event.node.id,
  	    companyId = $("#productlist").attr("data-company-id");
	    productEditor.getProducts(companyId, categoryId)
	    .done(function (products) {
  	      $("#results").spin(false);
	      $("#productlist").attr("data-current-page", "0");
	      productEditor.updatePager(products);
	      productEditor.showProducts(products);
	    });
  	  }
  	});

    $("#productpager > li > a").live(
      "click",
      function (event) {
  	var index = $(this).text(),
	companyId = $("#productlist").attr("data-company-id"),
	categoryId = $("#categorytree").tree("getSelectedNode").id;

  	$("#productlist").attr("data-current-page", index);
	productEditor.getProducts(companyId, categoryId).done(function (products) {
  	  productEditor.showProducts(products);
	  productEditor.updatePager(products);
	});
      });

    $("#productlist > tbody > tr > td > a").live(
      "click",
      function (event) {
	var productId = $(this).attr("href").slice(1),
	$anchor = $(this);
	$(".save-button").data("product-id", productId);

	productEditor.getProduct(productId)
	.done(function (product) {
	  if (product !== null) {	    
  	    var markup = "", key, label, input, fieldName,
	    companyId = $("#categorytree").attr("data-company-id");
	    // basic properties
  	    for (key in product) {
	      if (key !== "extended_properties" && key !== "id") {
		fieldName = key.replace(/_/g, " ");
  		label = "<td>" + fieldName + "</td>";
  		input = "<td><textarea rows='1' class='basic-field' name='" + key + "'>"
		  + product[key] + "</textarea></td>";
		input += "<td><input type='button' value='Set As Default' class='default-prop-button' data-key='" + key + "' data-value='" + product[key] + "' /></td>";
  		markup += "<tr>" + label + input + "</tr>";
	      }
  	    }
	    $("#basicinfo").html(markup);
	    
	    markup = "";
	    // extended properties
  	    for (key in product.extended_properties) {
	      fieldName = key.replace(/_/g, " ");
  	      label = "<td>" + fieldName + "</td>";
  	      input = "<td><textarea rows='1' class='extended-field' name='" + key + "'>" +
		product.extended_properties[key] + "</textarea></td>";
	      input += "<td><input type='button' value='Set As Default' class='default-prop-button' data-key='" + key + "' data-value='" + product[key] + "' /></td>";
  	      markup += "<tr>" + label + input + "</tr>";
  	    }

	    $("#extendedinfo").html(markup);
	    $("#product-sku-title").text(product.sku);
	    $("#productlist > tbody > tr").removeClass("info");
	    $anchor.parent().parent().addClass("info");

	    $("#rakuten-attributes").show().spin();
	    productEditor.getRakutenAttributes(companyId, product.id)
	      .done(
		function (attributes) {
		  $("#rakuten-attributes").spin(false);
		  if (attributes.length === 0) {
		    $("#rakuten-attributes").hide();
		  } else {
		    var i = 0, j = 0, att, markup = "", choices;
		    for (i = 0; i < attributes.length; i++) {
		      markup += "<hr />";
		      att = attributes[i];
		      switch (att.rule) {
		      case "0": // ONE_OF
			choices = att.values.split(",");
			markup +=
			"<div class='row-fluid'>" +
			  "<div class='span3'>" + att.name + "[one or more]</div>" +
			  "<div class='span7'>" +
			  "<div class='row'>";
			for (j = 0; j < choices.length; j++) {
			  var name = "rakuten_" + att.name + "___" + choices[j];
			  markup += "<input type='radio' name='" + name + "' />" + choices[j];
			  markup += "</div>";
			}

			markup += "</div><div class='span2'>";
			markup += "<input type='button' value='Set As Default' "
			markup += "class='default-att-button' data-attribute-id='' data-attribute-rule='' data-value-id='' /></div>";
			markup += "</div>";
			break;
		      case "1": // ONE_OR_MORE
			choices = att.values.split(",");
			markup +=
			"<div class='row-fluid'>" +
			  "<div class='span3'>" + att.name  + "[one or more]</div>" +
			  "<div class='span7'>";
			for (j = 0; j < choices.length; j++) {
			  markup += "<div>";
			  markup += "<input type='checkbox' " +
			    "name='rakuten_" + att.name + "___" + choices[j] +
			    "' />" + choices[j];
			  markup += "</div>";
			}
			markup += "</div><div class='span2'><input type='button' value='Set As Default' /></div>";
			markup += "</div>";
			break;
		      case "2": // ANY_STRING
		      case "3": // ANY_DECIMAL
		      case "4": // ANY_INTEGER
		      case "5": // ANY_BOOLEAN
			markup +=
			  "<div class='row-fluid'>" +
			  "<div class='span3'>" + att.name + 
			  " [any text]</div>" +
			  "<div class='span7'>" +
			  "<input type='text' name='" + "rakuten_" + att.name + "' />";
			
			markup += "</div><div class='span2'><input type='button' value='Set As Default' /></div>";
			markup += "</div>";
			break;
		      };
		    }
		  }
		  $("#rakuten-attribute-list").html(markup);
		});
	  }
	});
      });


    $(".save-button").bind(
      "click",
      function () {
	productEditor.getProduct($(this).data("product-id"))
	  .done(function (product) {
	    if (product !== null) {
	      $(".basic-field").each(function (i, input) {
		var name = $(input).attr("name"), value = $(input).val();
		product[name] = value;
	      });
	      $(".extended-field").each(function (i, input) {
		var name = $(input).attr("name"), value = $(input).val();
		product["extended_properties"][name] = value;
	      });

	      productEditor.uploadProduct(product).done(function (result) {
		console.log("DEBUG: Product saved");
	      }).fail(function (e) {
		console.log("WARNING: Post failed!", e);
	      });

	      productEditor.saveDatabase();
	    }
	  });
      });

    $(".default-att-button").live(
      "click",
      function () {
	var companyId = $("#categorytree").attr("data-company-id"),
	attributeId = $(this).data("attribute-id"),
	attributeRule = $(this).data("attribute-rule"),
	value = null,
	values = [],
	$button = $(this);

	switch(attributeRule) {
	case "1":
	  /* Gather all values and submit as json array */
	  $("input[name='" + $button.data("value-id") + "']:checked")
	    .each(function () {
	      values.push($(this).val());
	    });
	  value = JSON.stringify(values);
	  break;
	default:
	  /* submit single value */
	  value = JSON.stringify([$($button.data("value-id")).val()]);
	  break;
	};
	
	$button.val("[saving]")
	$button.attr("disabled", "disabled");
	productEditor.saveDefaultProperty(companyId, key, value).done(function () {
	  $button.val("Set As Default")
	  $button.removeAttr("disabled");
	});
	console.log("DEBUG: Default property button clicked");
      });

    $(".default-prop-button").live(
      "click",
      function () {
	var companyId = $("#categorytree").attr("data-company-id"),
	key = $(this).data("key"),
	value = $(this).data("value"),
	$button = $(this);
	
	$button.val("[saving]");
	$button.attr("disabled", "disabled");
	productEditor.saveDefaultProperty(companyId, key, value).done(function (){
	  $button.val("Set As Default");
	  $button.removeAttr("disabled");
	});
	console.log("DEBUG: Default property button clicked");
      });

    /* localStorage initialization */

    if (!(Modernizr.localstorage && Modernizr.json)) {
      console.log("WARNING: Local storage is not available.");
    } else {
      console.log("DEBUG: Initializing database");
      if (localStorage["producteditor.database"]) {
	var dbs = localStorage["producteditor.database"], i, data = [];
	for (i = 0; i < dbs.length; i++) {
	  data[i] = dbs.charCodeAt(i);
	}
	
	LZMA.decompress(
	  data, 
	  function (decompressed_db) {
	    try {
	      productEditor.database = JSON.parse(decompressed_db);
	    } catch(e) {
	      console.log("DEBUG: Could not parse cached DB, starting fresh");
	      productEditor.freshStart();
	    }
	    productEditor.updateCategoryTree();
	  },
	  function (percent) {
	    console.log("DEBUG: Decompressing database %" + percent.toString());
	  });
      } else {
	console.log("DEBUG: No database found in localStorage, starting fresh.");
	productEditor.freshStart();
	productEditor.updateCategoryTree();
      }
    }
    
  });

}());
