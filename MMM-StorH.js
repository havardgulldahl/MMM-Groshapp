/* Magic Mirror
 * Module: StorH
 *
 * By Petter Skog (https://skogdev.no)
 * MIT Licensed.
 */
var baseUrl = 'https://storhapi.skogdev.no/v1/';
var accessToken = null;
var groupId = null;
var self = null;

const performHttp = (requestUrl) => {
	return new Promise((resolve, reject) => {
		var hr = new XMLHttpRequest();
		hr.onreadystatechange = () => {

			// Success --> resolve
			if (hr.readyState == 4 && hr.status == 200) {
				resolve(hr.responseText);
			}
			// Token expired --> reauthenticate
			else if (hr.readyState == 4 && hr.status === 401) {
				authenticate()
					.then((result) => {
						if (result)
							resolve(result);
						else
							reject('unable to authenticate');
					})
			}
		}

		hr.open('GET', requestUrl, true);
		hr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		hr.send(null);
	})
}

const authenticate = () => {
	return new Promise((resolve) => {
		var hr = new XMLHttpRequest();
		hr.open('POST', baseUrl + 'auth/login', true);
		hr.setRequestHeader('Content-Type', 'application/json');
		hr.onreadystatechange = function () {
			if (hr.readyState == 4 && hr.status == 200) {
				var result = JSON.parse(hr.responseText).result;
				accessToken = result.accessToken;
				resolve(true);
			}
			else if (hr.readyState == 4)
				resolve(false)
		}
		hr.send(JSON.stringify({
			email: self.config.email,
			password: self.config.password
		}));
	})
}

const getGroup = () => {
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

const getData = (url) => {
	return performHttp(url)
		.then((response) => {
			var parsedResponse = JSON.parse(response);
			return parsedResponse.result;
		})
}

const startPolling = () => {
		var url = baseUrl + 'item/getitemsingroup?groupId=' + groupId + '&isShoppingList=true'
		getData(url)
			.then((result) => {
				self.items = result.slice(0, self.config.maxItems);
				self.updateDom(self.config.animationSpeed);
			})
	}

const tran = {
	MANUFACTURER: '',
	ITEMNAME: '',
	COUNT: '',
	LOADING: ''
}

Module.register('mmm-storh', {
	
	// Default module config.
	defaults: {
		showHeader: false, 				// Set this to true to show header
		maxItems: 10,					// Number of items to display (default is 10)
		animationSpeed: 0,				// How fast the animation changes when updating mirror (default is 0 second)
		fade: true,						// Set this to true to fade list from light to dark. (default is true)
		fadePoint: 0.25,			    // Start on 1/4th of the list. 
		items: []
	},

	getStyles: () => {
		return ["storh.css"];
	},

	getTranslations: () => {
		return {
			en: "translations/en.json",
			nb: "translations/nb.json"
		}
	},

	start: function () {
		self = this;
		self.items = [];

		Log.info('Starting module: ' + self.name);
		var translator = window.Translator;
		
		tran.MANUFACTURER = self.translate('MANUFACTURER');
		tran.ITEMNAME = self.translate('ITEMNAME');
		tran.COUNT = self.translate('COUNT');
		tran.LOADING = self.translate('LOADING');
		
		

		// Set locale and time format based on global config
		Log.log('setting locale to', config.language);

		// Setup
		authenticate()
			.then(() => getGroup())
			.then(() => startPolling())
			.then(() => {
				setInterval(() => {
					startPolling();
				}, 60000);
			})
			.catch((err) => {
				throw new Error(err);
			})
	},
	updateDomIfNeeded: () => {
		self.updateDom(self.config.animationSpeed);
	},
	getTableHeaderRow: () => {
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

	getTableRow: (item) => {
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
	getDom: () => {
		if (self.items.length > 0) {

			var table = document.createElement('table');
			table.className = 'storh small';

			if (self.config.showHeader) {
				table.appendChild(self.getTableHeaderRow());
			}

			for (var i = 0; i < self.items.length; i++) {

				var item = self.items[i];
				var tr = self.getTableRow(item);

				if (self.config.fade && self.config.fadePoint < 1) {
					if (self.config.fadePoint < 0) {
						self.config.fadePoint = 0;
					}
					var startingPoint = self.items.length * self.config.fadePoint;
					var steps = self.items.length - startingPoint;
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
