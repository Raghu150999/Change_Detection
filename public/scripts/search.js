// Front-end script file for search.ejs template

// Date() to formatted Date conversion
let d = new Date();
let strd = '' + (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
let td = new Date(strd);
let $start_date, $end_date;
let cache; // Cached data variable
let url = '';
let mymap; // Map variable

var loadMap = () => {
	/*
	------------------------------------------------------------
		Loading the Map
	------------------------------------------------------------
	*/

	/* Not using streets base for now.
	var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets',
		accessToken: mapboxkey
	});
	*/
	var satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets',
		accessToken: mapboxkey
	});
	mymap = L.map('mymap', {
		center: [26.40, 90.619],
		zoom: 8,
		layers: [satellite] // Change default map here
	});
	/* For adding multiple base layers
	var baseMaps = {
		"streets": streets,
		"satellite": satellite
	};
	L.control.layers(baseMaps, null).addTo(mymap);
	*/
}

$(document).ready(function() {
	$start_date = $('#start_date').datepicker({
		change: function(e) {
			let sd = new Date($start_date.value());
			if(sd > td) {
				$start_date.value(strd);
			}
		}
	});
	$end_date = $('#end_date').datepicker({
		change: function(e) {
			let ed = new Date($end_date.value());
			if(ed > td) {
				$end_date.value(strd);
			}
		}
	});

	// Initializing to today's date
	$start_date.value(strd);
	$end_date.value(strd);
	
	// datepicker value to Date() conversion
	// console.log(new Date($start_date.value()))

	// Http Request to get locations
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(this.readyState == 4 && this.status == 200) {
			states = JSON.parse(this.responseText);

			// Use '%' twice to escape ejs inside ejs
			let template = `
					<option selected>Choose a state</option>
					<% states.forEach(state => { %>
						<option><%= state %></option>
					<% }) %>
				`;
			let html = ejs.render(template, {states: states});
			$('#locationSelect').html(html)
		}
	}
	xhttp.open('GET', '/api/states', true);
	xhttp.send();
	loadMap();
})

var displayError2 = () => {
	let html = `
		<div class="alert alert-danger alert-dismissible fade show" role="alert">
			Please specify a location
			<button type="button" class="close" data-dismiss="alert" aria-label="Close">
				<span aria-hidden="true">&times;</span>
			</button>
		</div>
	`;
	$('#msg3').html(html);
}

function wait(ms) {
	var start = Date.now(),
			now = start;
	while (now - start < ms) {
		now = Date.now();
	}
}

var delayedLoad = () => {
	$('img').each(function() {
		$(this).attr('src', $(this).data('delayedsrc'));
		wait(200);
		console.log('Image loaded');
	})
}

var reloadImages = () => {
	// Error handling code to reload images until it loads
	if (document.images) {
		var imageArray = new Array(document.images.length);
		var i = 0;
		for (i = 0; i < document.images.length; i++) {
			imageArray[i] = new Image();
			imageArray[i].src = document.images[i].src;
			//try to reload image in case of error
			var imgErrorFunction = function () {
				var img = this;
				setTimeout(function () {
					img.src = img.src + '&timestamp=' + new Date().getTime();
				}, 1000);
			}
			document.images[i].onerror = imgErrorFunction;
		}
	}
}

let handleSubmit = () => {
	let sd = $start_date.value();
	let ed = $end_date.value();
	let state = $('#locationSelect')[0].value;
	if(state == 'Choose a state') {
		displayError2();
		return;
	}
	let spinner = `
		<div class="spinner-border text-muted "></div>
	`;
	$('#searchSpinner').html(spinner);
	if(sd > ed) {
		let template = `
			<div class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="position: absolute; top: 0; right: 0; z-index: 1; width: 400px;">
				<div class="toast-header">
					<strong class="mr-auto">Error</strong>
					<small class="text-muted">just now</small>
					<button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="toast-body">
					Invalid Date field values!
				</div>
			</div>
		`;
		$('#alert-toast').html(template)
		$('.toast').toast({
			autohide: false
		});
		$('.toast').toast('show');
		return;
	}
	let data = {
		start_date: sd,
		end_date: ed,
		state: $('#locationSelect')[0].value
	};
	let satellite = $('#satelliteSelect')[0].value;
	if(satellite == 'Sentinel 1') {
		url = '/sentinel1';
	} else {
		url = '/sentinel2';
	}
	axios.post('/api' + url + '/getdata', data)
		.then(res => {
			let html = `<div class = "collection">` + res.data.html + `</div>`
			$('#flood').html(html);
			$('#searchSpinner').html('');
			cache = res.data.data;
			console.log('Cache', cache)
			delayedLoad();
			reloadImages();
		});
}

let downloads = (id) => {
	id = Number(id);
	let data = {
		scene: cache[id].scene,
		base_url: cache[id].base_url,
		classified_url: cache[id].classified_url,
		locationName: cache[id].locationName,
		footprint: cache[id].footprint,
		point: cache[id].point,
		date: cache[id].date,
		sceneMetaID: cache[id].sceneMetaID
	};
	axios.post('/api' + url + '/tile', data)
		.then(res => {
			let data = res.data;
			let type = url == '/sentinel1' ? 'SAR' : 'Optical';
			let template = `
			<div class="container-fluid">
				<a href="<%= base_url %>" class="btn btn-primary" target="_blank">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download ${type} (jpeg)</a>
				<br><br>
				<a href="<%= classified_url %>" class="btn btn-primary" target="_blank">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download Classified Layer (jpeg)</a>
				<br><br>
				<a href="<%= kml_url %>" class="btn btn-primary">
				<i class="fa fa-download" aria-hidden="true"></i><span> </span>Download Layer (kml)</a>
				<br><br>
			</div>
			`;
			let html = ejs.render(template, data);
			$('#modalBody1').html(html);
			$('#dmodal1').modal();
		})
}

let changeOpacity = (id) => {
	let opacity = $('#slider' + id)[0].value/100;
	let tileLayer = cache[id].tileLayer;
	if(tileLayer) {
		console.log('changed');
		tileLayer.setOpacity(opacity);
	}
	$('#classifiedImage' + id).css('opacity', opacity);
}

let viewTile = (id) => {
	id = Number(id);
	let data = cache[id];
	let footprintState = data.footprintState;
	let footprint = data.footprint;
	let point = data.point;
	if(!footprint) {
		return;
	}
	// Toggling polygon on map
	if(footprintState == null || footprintState == undefined) {
		cache[id].footprintState = 1;
		var polygon = L.polygon(footprint).addTo(mymap);
		console.log(footprint);
		cache[id].polygon = polygon;
		mymap.setView([point[1], point[0]], 8);
	} else if(footprintState == 0) {
		var polygon = cache[id].polygon;
		polygon.addTo(mymap);
		mymap.setView([point[1], point[0]], 8);
		cache[id].footprintState = 1;
	} else {
		var polygon = cache[id].polygon;
		polygon.remove();
		cache[id].footprintState = 0;
	}
}

let overlayImage = (id) => {
	id = Number(id);
	let data = cache[id];
	let footprint = data.footprint;
	if(!data.tileLayer) {
		let mapid = data.mapid;
		let token = data.token;
		data.tileLayer = L.tileLayer(`https://earthengine.googleapis.com/map/${mapid}/{z}/{x}/{y}?token=${token}`);
		data.tileLayer.addTo(mymap);
		data.imageState = 1;
	} else if(data.imageState == 0) {
		data.tileLayer.addTo(mymap);
		data.imageState = 1;
		mymap.fitBounds(L.latLngBounds(footprint[0]));
	} else {
		data.tileLayer.remove();
		data.imageState = 0;
	}
}