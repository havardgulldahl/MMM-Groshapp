/* Magic Mirror
 * Module: Groshapp


 *
 * By Håvard Gulldahl (havard@gulldahl.no)
 * Based upon work by Petter Skog (https://skogdev.no)
 * MIT Licensed.
 */
const baseUrl = "https://groshapp.com/edge";

var dataFetcherFactory = function (config) {
  let headers = new Headers();
  headers.append(
    "Authorization",
    "Basic " + btoa(config.email + ":" + config.password)
  );

  var fetcher = function (url) {
    return fetch(url, { headers: headers }).then((response) => {
      return response.json();
    });
  };
  return fetcher;
};

var getLists = function (fetcher) {
  let url = baseUrl + "/users/me/households";
  return fetcher(url).then((_lists) => {
    if (_lists.length == 0) throw "User has no lists";
    return _lists;
  });
};

var startPolling = function (self, fetcher) {
  var url =
    baseUrl +
    "/households/" +
    encodeURIComponent(self.mainList.id) +
    "/current";
  fetcher(url).then((result) => {
    let _itms = result.flatMap((l) => l.groceries);
    self.items = _itms.slice(0, self.config.maxItems);
    self.updateDom(0);
  });
};

var tran = {
  MANUFACTURER: "",
  ITEMNAME: "",
  COUNT: "",
  LOADING: "",
};

Module.register("MMM-Groshapp", {
  defaults: {
    showHeader: true,
    maxItems: 10,
  },
  getStyles: () => {
    return ["groshapp.css"];
  },

  getTranslations: () => {
    return {
      en: "translations/en.json",
      nb: "translations/nb.json",
    };
  },

  start: function () {
    /** @type {Array} */
    this.items = [];

    Log.info("Starting module: " + this.name);
    var translator = this.Translator;

    tran.MANUFACTURER = this.translate("MANUFACTURER");
    tran.ITEMNAME = this.translate("ITEMNAME");
    tran.COUNT = this.translate("COUNT");
    tran.LOADING = this.translate("LOADING");

    // Set locale and time format based on global config
    Log.log("setting locale to", config.language);
    /** @type {Object} */
    this.mainList = null;

    // Setup
    let getData = dataFetcherFactory(this.config);
    getLists(getData)
      .then((lists) => {
        if (this.config.shoppinglist !== undefined) {
          this.mainList = lists.find(
            (itm) => itm.name == this.config.shoppinglist
          );
        } else {
          //get first list that has non-zero items
          this.mainList = lists.find((itm) => itm.size > 0);
        }
        return true;
      })
      .then(() => startPolling(this, getData))
      .then(() => {
        setInterval(() => {
          startPolling(this, getData);
        }, 1000 * 60 * 60 * 3);
      })
      .catch((err) => {
        throw new Error(err);
      });
  },
  updateDomIfNeeded: function (self) {
    self.updateDom(this.config.animationSpeed);
  },
  getTableHeaderRow: function () {
    var thItemName = document.createElement("th");
    thItemName.className = "light";
    thItemName.appendChild(document.createTextNode(tran.ITEMNAME));

    var thCount = document.createElement("th");
    thCount.className = "light";
    thCount.appendChild(document.createTextNode(tran.COUNT));

    var thPrice = document.createElement("th");
    thPrice.className = "light";
    thPrice.appendChild(document.createTextNode(tran.PRICE));

    var thead = document.createElement("thead");
    thead.addClass = "xsmall dimmed";
    thead.appendChild(thItemName);
    thead.appendChild(thCount);
    // disable until we figure out how to format it
    //thead.appendChild(thPrice);

    return thead;
  },

  getTableRow: function (item) {
    var tdItemName = document.createElement("td");
    tdItemName.className = "itemname bright";
    tdItemName.appendChild(document.createTextNode(item.name));

    var tdCount = document.createElement("td");
    tdCount.className = "count";
    tdCount.appendChild(document.createTextNode(item.amount));

    var tdItemPrice = document.createElement("td");
    var txtLine = document.createTextNode(item.price);
    tdItemPrice.appendChild(txtLine);

    var tr = document.createElement("tr");
    tr.appendChild(tdItemName);
    tr.appendChild(tdCount);
    // disable until we figure out how to format it
    //tr.appendChild(tdItemPrice);

    return tr;
  },
  getDom: function () {
    if (this.items.length > 0) {
      var table = document.createElement("table");
      table.className = "groshapp small";

      if (this.config.showHeader) {
        table.appendChild(this.getTableHeaderRow());
      }

      for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        var tr = this.getTableRow(item);

        if (this.config.fade && this.config.fadePoint < 1) {
          if (this.config.fadePoint < 0) {
            this.config.fadePoint = 0;
          }
          var startingPoint = this.items.length * this.config.fadePoint;
          var steps = this.items.length - startingPoint;
          if (i >= startingPoint) {
            var currentStep = i - startingPoint;
            tr.style.opacity = 1 - (1 / steps) * currentStep;
          }
        }

        table.appendChild(tr);
      }

      return table;
    } else {
      var wrapper = document.createElement("div");
      wrapper.innerHTML = tran.LOADING;
      wrapper.className = "small dimmed";
    }

    return wrapper;
  },
});
