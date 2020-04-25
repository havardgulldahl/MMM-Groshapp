/* Magic Mirror
 * Module: Groshapp


 *
 * By Håvard Gulldahl (havard@gulldahl.no)
 * Based upon work by Petter Skog (https://skogdev.no)
 * MIT Licensed.
 */
var baseUrl = 'https://groshapp.com/edge'
var accessToken = null;
var groupId = null;

var getGroup = function() {
		var url = baseUrl + 'group/getgroups';
		return getData(url)
			.then((result) => {
				if (result.length > 0) {
					groupId = result[0].id;
					return;
				}
				else
					throw 'User has no group';
			});
	}

var getData = function(url) {
	let headers =  new Headers();
	headers.append("Authorization", "Basic " + btoa(config.email + ":" +config.password));

	return fetch(url, {"headers": headers})
		.then((response) => {
			return response.json();
		})
}

var startPolling = function(self) {
		var url = baseUrl + 'item/getitemsingroup?groupId=' + groupId + '&isShoppingList=true'
		getData(url)
			.then((result) => {
				self.items = result.slice(0, this.config.maxItems);
				self.updateDom(0);
			})
	}

var tran = {
	MANUFACTURER: '',
	ITEMNAME: '',
	COUNT: '',
	LOADING: ''
}

Module.register('MMM-Groshapp', {
	
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
			nb: "translations/nb.json"
		}
	},

	start: function () {
		Log.log('starting');
		console.log(this);
		this.items = [];

		Log.info('Starting module: ' + this.name);
		var translator = this.Translator;
		
		tran.MANUFACTURER = this.translate('MANUFACTURER');
		tran.ITEMNAME = this.translate('ITEMNAME');
		tran.COUNT = this.translate('COUNT');
		tran.LOADING = this.translate('LOADING');
		
		// Set locale and time format based on global config
		Log.log('setting locale to', config.language);

		// Setup
		authenticate(this.config)
			.then(() => getGroup())
			.then(() => startPolling(this))
			.then(() => {
				setInterval(() => {
					startPolling(this);
				}, 60000);
			})
			.catch((err) => {
				throw new Error(err);
			})
	},
	updateDomIfNeeded: function(self) {
		self.updateDom(this.config.animationSpeed);
	},
	getTableHeaderRow: function() {
		var thBrand = document.createElement('th');
		thBrand.className = 'light';
		thBrand.appendChild(document.createTextNode(tran.MANUFACTURER));

		var thItemName = document.createElement('th');
		thItemName.className = 'light';
		thItemName.appendChild(document.createTextNode(tran.ITEMNAME));

		var thCount = document.createElement('th');
		thCount.className = 'light';
		thCount.appendChild(document.createTextNode(tran.COUNT));

		var thead = document.createElement('thead');
		thead.addClass = 'xsmall dimmed';
		thead.appendChild(thBrand);
		thead.appendChild(thItemName);
		thead.appendChild(thCount);

		return thead;
	},

	getTableRow: function(item) {
		var tdItemManu = document.createElement('td');
		tdItemManu.className = 'manu';
		var txtLine = document.createTextNode(item.itemManu);
		tdItemManu.appendChild(txtLine);

		var tdItemName = document.createElement('td');
		tdItemName.className = 'itemname bright';
		tdItemName.appendChild(document.createTextNode(item.itemName));


		var tdCount = document.createElement('td');
		tdCount.className = 'count center';
		tdCount.appendChild(document.createTextNode(item.count));

		var tr = document.createElement('tr');
		tr.appendChild(tdItemManu);
		tr.appendChild(tdItemName);
		tr.appendChild(tdCount);

		return tr;
	},
	getDom: function() {
		if (this.items.length > 0) {

			var table = document.createElement('table');
			table.className = 'groshapp small';

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
						tr.style.opacity = 1 - (1 / steps * currentStep);
					}
				}

				table.appendChild(tr);
			}

			return table;
		} else {
			var wrapper = document.createElement('div');
			wrapper.innerHTML = tran.LOADING;
			wrapper.className = 'small dimmed';
		}

		return wrapper;
	}
});
