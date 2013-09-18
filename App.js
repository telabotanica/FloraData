'use strict';

var ___CEL = {
	models: {},
	views: {},
	utils: {},
	dao: {}
};

// -------------------------------------------------- Utilities ---------------------------------------------------- //

// The Template Loader. Used to asynchronously load templates located in separate .html files
___CEL.utils.templateLoader = {
	templates: {},
	
	load: function(names, callback) {
		var deferreds = [],
			self = this;
		
		$.each(names, function(index, name) {
			deferreds.push($.get('templates/' + name + '.html', function(data) {
				self.templates[name] = data;
			}));
		});
		$.when.apply(null, deferreds).done(callback);
	},
	
	get: function(name) {
		return this.templates[name];
	}
};



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DAO ESPECE
___CEL.dao.EspeceDAO = function(db) {
	this.db = db;
};
_.extend(___CEL.dao.EspeceDAO.prototype, {
	findByName: function(key, callback) {
		this.db.transaction(function(tx) {
			var sql = 
				"SELECT num_nom, nom_sci " +
				"FROM espece " + 
				"WHERE nom_sci LIKE ? " +
				"ORDER BY nom_sci";
			tx.executeSql(sql, [key + '%'], function(tx, results) {
				var len = results.rows.length,
					especes = [],
					i = 0;
				for (; i < len; i = i + 1) {
					especes[i] = results.rows.item(i);
				}
				callback(especes);
			});
		},
		function(tx, error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	},
	
	populate: function(callback) {
		___CEL.db.transaction(function(tx) {
			console.log('Dropping ESPECE table');
			tx.executeSql('DROP TABLE IF EXISTS espece');
			var sql =
				"CREATE TABLE IF NOT EXISTS espece (" +
					"id INT NOT NULL, " +
					"num_nom INT NOT NULL ," +
					"nom_sci VARCHAR(500) NOT NULL ," +
					"num_nom_retenu INT NULL ," +
					"nom_sci_retenu VARCHAR(500) NULL ," +
					"num_taxon INT NULL ," +
					"famille VARCHAR(255) NULL ," +
					"referentiel VARCHAR(45) NOT NULL ," +
				"PRIMARY KEY (id) )";
			console.log('Creating ESPECE table');
			tx.executeSql(sql);
			tx.executeSql("INSERT INTO espece (id, num_nom, nom_sci, referentiel) VALUES(-1, -1, 'null', 'null')");
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		},
		function(tx) {	});
		
		console.log('Inserting espece');
		$.ajax({
			type: 'GET',
			url: './cel_apps.csv',
			dataType: 'text',
			success: function(fichier) { 
				var arr_lignes = fichier.split(/\r\n|\r|\n/),
					arr_sql = new Array(),
					max = arr_lignes.length - 1;
					//max = 20000;
				for (var i = 1; i < max; i++) {
					var sql = '',
						arr_valeurs = arr_lignes[i].split(';');
						sql += i + ',';
					for (var j = 0; j < arr_valeurs.length; j++) {
						if (arr_valeurs[j] == '') {
							sql +=  'null';
						} else {
							sql += arr_valeurs[j];
						}
						if (j < (arr_valeurs.length - 1)) {
							sql += ',';
						}
					}
					arr_sql.push(
						"INSERT INTO espece "
						+ "(id, num_nom, nom_sci, famille, num_taxon, referentiel) "
						+ "VALUES (" + sql + ")"
					);
				}
				//console.log(arr_sql);
				___CEL.db.transaction(function (tx) {
					for (var c = 0; c < arr_sql.length; c++) {
						tx.executeSql(arr_sql[c]);
					}
				}, 
				function(error) {
					console.log('DB | Error processing SQL: ' + error.code, error);
				},
				function(tx) {	});
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	}
});
_.extend(___CEL.dao.EspeceDAO.prototype, ___CEL.dao.baseDAOBD);




//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DAO OBSERVATION
___CEL.dao.ObsDAO = function(db) {
	this.db = db;
};
_.extend(___CEL.dao.ObsDAO.prototype, {
	findById: function(id, callback) {
		this.db.transaction(function(tx) {
			var sql = 
				"SELECT num_nom, nom_sci, id_obs, date, commune, code_insee, " + 
					"ref_libre, texte_libre, ce_espece, " +
				"famille, referentiel, lieu_dit, station, milieu, certitude, abondance, phenologie " +  
				"FROM obs o " +
				"LEFT JOIN espece e ON e.num_nom = o.ce_espece " +
				"WHERE id_obs = :id_obs";
			tx.executeSql(sql, [id], function(tx, results) {
				callback(results.rows.length === 1 ? results.rows.item(0) : null);
			});
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	},
	
	findAll: function(callback) {
		this.db.transaction(function(tx) {
			var sql = 
				"SELECT num_nom, nom_sci, id_obs, date, commune, code_insee, a_ete_transmise, " +
					"ce_espece, texte_libre, ref_libre " +
				"FROM obs " +
				"LEFT JOIN espece ON num_nom = ce_espece " +
				"ORDER BY a_ete_transmise ASC, id_obs DESC";
			tx.executeSql(sql, [], function(tx, results) {
				 var nbre = results.rows.length,
					especes = [],
					i = 0;
				for (; i < nbre; i = i + 1) {
					especes[i] = results.rows.item(i);
				}
				callback(especes);
			});
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	},
	
	populate: function(callback) {
		___CEL.db.transaction(function(tx) {
			//console.log('Dropping OBS table');
			//tx.executeSql('DROP TABLE IF EXISTS obs');
			var sql =
				"CREATE TABLE IF NOT EXISTS obs (" +
					"id_obs INT NOT NULL, "+
					"date DATE NOT NULL, " +
					"latitude DECIMAL NULL, " +
					"longitude DECIMAL NULL, " +
					"commune VARCHAR(255) NULL, " +
					"code_insee INT NULL, " +
					"lieu_dit VARCHAR(255) NULL DEFAULT NULL, " +
					"station VARCHAR(255) NULL DEFAULT NULL, " +
					"milieu VARCHAR(255) NULL DEFAULT NULL, " +
					"certitude VARCHAR(255) NULL DEFAULT NULL, " +
					"abondance VARCHAR(255) NULL DEFAULT NULL, " +
					"phenologie VARCHAR(255) NULL DEFAULT NULL, " +
					"mise_a_jour TINYINT(1) NOT NULL DEFAULT 0, " +
					"a_ete_transmise TINYINT(1) NOT NULL DEFAULT 0, " +
					"ce_espece INT NOT NULL, " +
					"texte_libre VARCHAR(500) NULL, " +
					"ref_libre VARCHAR(45) NULL ," +
					"PRIMARY KEY (id_obs), " +
					"CONSTRAINT ce_espece " +
						"FOREIGN KEY (ce_espece)" +
						"REFERENCES espece (num_nom)" +
						"ON DELETE NO ACTION " +
						"ON UPDATE NO ACTION " +
				")";
			console.log('Creating OBS table');
			tx.executeSql(sql);
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		},
		function(tx) {	});
	}
});
_.extend(___CEL.dao.ObsDAO.prototype, ___CEL.dao.baseDAOBD);


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DAO PHOTO
___CEL.dao.PhotoDAO = function(db) {
	this.db = db;
};
_.extend(___CEL.dao.PhotoDAO.prototype, {
	findByObs: function(id, callback) {
		this.db.transaction(function(tx) {
			var sql = 
				"SELECT id_photo, chemin " +
				"FROM photo " +
				"WHERE ce_obs = :id_obs";

			tx.executeSql(sql, [id], function(tx, results) {
				 var nbre = results.rows.length,
					photos = [],
					i = 0;
				for (; i < nbre; i = i + 1) {
					photos[i] = results.rows.item(i);
				}
				callback(photos);
			});
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	},
	
	populate: function(callback) {
		___CEL.db.transaction(function(tx) {
			//console.log('Dropping PHOTO table');
			//tx.executeSql('DROP TABLE IF EXISTS photo');
			var sql =
				"CREATE TABLE IF NOT EXISTS photo (" +
					"id_photo INT NOT NULL ," +
					"chemin TEXT NOT NULL ," +
					"ce_obs INT NOT NULL ," +
					"PRIMARY KEY (id_photo) ," +
					"CONSTRAINT ce_obs " +
						"FOREIGN KEY (ce_obs) " +
						"REFERENCES obs (id_obs) " +
						"ON DELETE NO ACTION " + 
						"ON UPDATE NO ACTION " +
				")";
			console.log('Creating PHOTO table');
			tx.executeSql(sql);
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		},
		function(tx) {	});
	}
});
_.extend(___CEL.dao.PhotoDAO.prototype, ___CEL.dao.baseDAOBD);



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ DAO UTILISATEUR
___CEL.dao.UtilisateurDAO = function(db) {
	this.db = db;
};
_.extend(___CEL.dao.UtilisateurDAO.prototype, {
	findOne: function(callback) {
		this.db.transaction(function(tx) {
			var sql = 
				"SELECT id_user,email, compte_verifie " +
				"FROM utilisateur " + 
				"WHERE compte_verifie LIKE 'true' "
				"ORDER BY email ASC";
			tx.executeSql(sql, [], function(tx, results) {
				callback(results.rows.length >= 1 ? results.rows.item(0) : null);
			});
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	},
	
	populate: function(callback) {
		___CEL.db.transaction(function(tx) {
			//console.log('Dropping UTILISATEUR table');
			//tx.executeSql('DROP TABLE IF EXISTS utilisateur');
			var sql =
				"CREATE TABLE IF NOT EXISTS utilisateur (" +
					"id_user INT NOT NULL, " +
					"email VARCHAR(255) NOT NULL, " +
					"compte_verifie BOOLEAN NOT NULL, " +
					"PRIMARY KEY (id_user) " +
				")";
			console.log('Creating UTILISATEUR table');
			tx.executeSql(sql);
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		},
		function(tx) {	});
	}
});
_.extend(___CEL.dao.UtilisateurDAO.prototype, ___CEL.dao.baseDAOBD);



// Overriding Backbone's sync method. Replace the default RESTful services-based implementation
// with a simple local database approach.
Backbone.sync = function(method, model, options) {
	var dao = new model.dao(___CEL.db);
	
	if (method === 'read') {
		if (model.id) {
			dao.findById(model.id, function(data) {
				options.success(data);
			});
		} else {
			if (model.id_obs) {
				dao.findByObs(model.id_obs, function(data) {
					options.success(data);
				});
			} else {
				dao.findAll(function(data) {
					options.success(data);
				});
			}
		}
	}
};



// -------------------------------------------------- The Models ---------------------------------------------------- //


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Modèle ESPECE
___CEL.models.Espece = Backbone.Model.extend({
	dao: ___CEL.dao.EspeceDAO,
	initialize: function() {	}
});
___CEL.models.EspeceCollection = Backbone.Collection.extend({
	dao: ___CEL.dao.EspeceDAO,
	model: ___CEL.models.Espece,
	
	findByName: function(key) {
		var especeDAO = new ___CEL.dao.EspeceDAO(___CEL.db),
			self = this;
		especeDAO.findByName(key, function(data) {
			//console.log('EspeceCollection | findByName ', data);
			self.reset(data);
		});
	}
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Modèle OBSERVATION
___CEL.models.Obs = Backbone.Model.extend({
	dao: ___CEL.dao.ObsDAO,
	initialize: function() {	}
});
___CEL.models.ObsCollection = Backbone.Collection.extend({
	dao: ___CEL.dao.ObsDAO,
	model: ___CEL.models.Obs,
	
	findById: function(key) {
		var obsDAO = new ___CEL.dao.ObsDAO(___CEL.db),
			self = this;
		obsDAO.findById(key, function(data) {
			//console.log('ObsCollection | findById ', data);
			self.reset(data);
		});
	},
	
	findAll: function() {
		var obsDAO = new ___CEL.dao.ObsDAO(___CEL.db),
			self = this;
		obsDAO.findAll(function(data) {
			//console.log('ObsCollection | findAll ', data);
			self.reset(data);
		});
	}
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Modèle PHOTO
___CEL.models.Photo = Backbone.Model.extend({
	dao: ___CEL.dao.PhotoDAO,
	initialize: function() {	}
});
___CEL.models.PhotoCollection = Backbone.Collection.extend({
	dao: ___CEL.dao.PhotoDAO,
	model: ___CEL.models.Photo,
	
	findByObs: function(key) {
		var photoDAO = new ___CEL.dao.PhotoDAO(___CEL.db),
			self = this;
		photoDAO.findByObs(key, function(data) {
			//console.log('PhotoCollection | findByObs ', data);
			self.reset(data);
		});
	}
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Modèle UTILISATEUR
___CEL.models.Utilisateur = Backbone.Model.extend({
	dao: ___CEL.dao.UtilisateurDAO,
	initialize: function() {	}
});
___CEL.models.UtilisateurCollection = Backbone.Collection.extend({
	dao: ___CEL.dao.UtilisateurDAO,
	model: ___CEL.models.Utilisateur,
	
	findOne: function() {
		var utilisateurDAO = new ___CEL.dao.UtilisateurDAO(___CEL.db),
			self = this;
		utilisateurDAO.findOne(function(data) {
			//console.log('UtilisateurCollection | findOne ', data);
			self.reset(data);
		});
	}
});



// -------------------------------------------------- The Views ---------------------------------------------------- //


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Vue Page Saisie OBS
___CEL.views.saisieObs = Backbone.View.extend({
	initialize: function(data) {
		geolocaliser();
		var date = new Date(),
			jour = date.getDate(),
			mois = date.getMonth() + 1,
			annee = date.getFullYear(),
			aujourdhui = 
				( (''+jour).length < 2 ? '0' : '') + jour + '/' +
				( (''+mois).length < 2 ? '0' : '') + mois + '/' +
				annee;
		this.date = aujourdhui;
		this.template = _.template(___CEL.utils.templateLoader.get('obs-saisie'));
	},
	
	render: function(eventName) {
		//this.model.attributes.position = this.position;
		//console.log(this.model);
		$(this.el).html(this.template({ date : this.date}));
		return this;
	}
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Vue Détails OBS
___CEL.views.ObsPage = Backbone.View.extend({
	initialize: function(data) {
		//console.log(data);
		this.data = data.model.attributes;
		this.model = new ___CEL.models.PhotoCollection();
		this.model.findByObs(data.model.attributes.id_obs);
		this.model.bind('reset', this.render, this);		
		this.template = _.template(___CEL.utils.templateLoader.get('obs-page'));
	},

	render: function(eventName) { 	
		console.log(this.data);
		var photos = new Array();
		for (var i = 0; i < this.model.models.length; i++) {
			photos.push(this.model.models[i].attributes);
		}
		
		var json = {
			'obs' : this.data,
			'photos' : photos
		}
		$(this.el).html(this.template(json));
		return this;
	}
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Vue Liste OBS
___CEL.views.transmissionObs = Backbone.View.extend({
	initialize: function(data) {
		this.model = new ___CEL.models.ObsCollection();
		this.model.findAll();
		this.model.bind('reset', this.render, this);
		
		this.utilisateur = new ___CEL.models.UtilisateurCollection();
		this.utilisateur.findOne();
		this.utilisateur.bind('reset', this.render, this);
		
		this.template = _.template(___CEL.utils.templateLoader.get('obs-liste'));
	},

	render: function(eventName) { 
		var arr_obs = new Array(),
			arr_transmises = new Array();
		
		for (var i = 0; i < this.model.models.length; i++) {
			if (this.model.models[i].attributes.a_ete_transmise == 1) {
				arr_transmises.push(this.model.models[i]);
			} else {
				arr_obs.push(this.model.models[i]);
			}
		}
		var json = {
			'obs' : arr_obs,
			'transmises' : arr_transmises,
			'email' : (this.utilisateur.models[0] == undefined) ? null : this.utilisateur.models[0].attributes.email
		}
		//console.log(arr_obs);
		$(this.el).html(this.template(json));
		return this;
	}
});



// ----------------------------------------------- The Application Router ------------------------------------------ //
___CEL.Router = Backbone.Router.extend({
	routes: {
		'' : 'saisie',
		'observation/:id_obs' : 'detailsObs',
		'transmission' : 'transmissionObs'
	},
	
	initialize: function() {
		var self = this;
		// Keep track of the history of pages (we only store the page URL). Used to identify the direction
		// (left or right) of the sliding transition between pages.
		this.pageHistory = [];
		
		
		$('#content').on('keyup', '#taxon', function(event) {
			$('#liste-taxons').html('');
			var recherche = $('#taxon').val(),
				arr_recherche = recherche.split(' ');
			if (recherche.length > 1) {	
				___CEL.db.transaction(function(tx) {
					var arr_parametres = new Array(),
						clause_where = "WHERE nom_sci LIKE ? ";
					if (arr_recherche.length > 1) {
						clause_where = "WHERE (nom_sci LIKE ? OR nom_sci LIKE ?) ";
						arr_parametres.push(arr_recherche[0] + '% ' + arr_recherche[1] + '%');
						arr_parametres.push(arr_recherche[0] + '% x ' + arr_recherche[1] + '%');
					} else {
						arr_parametres.push(recherche + '%');
					}
					arr_parametres.push($('#referentiel').val());
					
					var sql = 
						"SELECT num_nom, nom_sci " +
						"FROM espece " + 
						clause_where + 
						"AND referentiel = ? " + 
						"ORDER BY nom_sci";
					tx.executeSql(sql, arr_parametres, function(tx, results) {
						for (var i = 0; i < results.rows.length; i = i + 1) {
							var id = results.rows.item(i).num_nom,
								nom_sci = results.rows.item(i).nom_sci,
								elt = '<li id="' + id + '" class="choix-taxons">' + nom_sci + '</li>';
							$('#liste-taxons').append(elt);
						}
					});
				},
				function(tx, error) {
					console.log('DB | Error processing SQL: ' + error.code, error);
				});
			}
			
			if ($.trim(recherche) != '') {
				$('#sauver-obs').removeClass('hide');
			}
		});
		$('#content').on('click', '.choix-taxons', function(event) {
			var id = this.id,
				taxon = '';
				
			if (id != -1) {
				taxon = $('#'+id).html();
			} else {
				taxon = $('#taxon').val();
			}
			$('#num_nom_select').val(id);
			$('#liste-taxons').html('');
			$('#taxon').val('');
			$('#taxon-choisi').html(taxon);
			$('#taxon-modal').modal('hide');
		});
		
		
		$('#content').on('click', '#btn-plante', function(event) {
			if ($('#form-plante').hasClass('hide')) {
				$('#form-plante').removeClass('hide');
			} else {
				$('#form-plante').addClass('hide');
			}
			$('#form-lieu').addClass('hide');
		});
		$('#content').on('click', '#btn-lieu', function(event) {
			if ($('#form-lieu').hasClass('hide')) {
				$('#form-lieu').removeClass('hide');
			} else {
				$('#form-lieu').addClass('hide');
			}
			$('#form-plante').addClass('hide');
		});
		$('#content').on('change', '#referentiel', function(event) {
			$('#taxon').val('');
			$('#liste-taxons').html('');
			$('#taxon-choisi').html('');
			$('#num_nom_select').val(0);
			
			$('#lieudit').val('');
			$('#station').val('');
			$('#milieu').val('');
						
			$('#certitude').val('NULL');
			$('#abondance').val('NULL');
			$('#stade_ph').val('NULL');
		});
		$('#garder-lieu').on('click', function(event) {
			$('#referentiel').val('bdtfx:v1.01');
			$('#taxon').val('');
			$('#taxon-choisi').html('');
			$('#num_nom_select').val(0);
			$('#liste-taxons').html('');
			
			$('#certitude').val('NULL');
			$('#abondance').val('NULL');
			$('#stade_ph').val('NULL');
			$('#form-plante').addClass('hide');
			$('#form-lieu').removeClass('hide');
			
			$('#obs-photos').html('');
			$('#nbre-photos').html(0);
			$('#prendre-photos-texte').html('Ajouter une photo...');
			$('.ajouter-photos').removeClass('hide');
		});
		
		
		$('#content').on('click', '#geolocaliser', geolocaliser);
		$('#content').on('click', '#sauver-obs', function(event) {
			if ($('#num_nom_select').val() != 0) {
				___CEL.db.transaction(function(tx) {
					var sql =
						"SELECT id_obs " +
						"FROM obs " + 
						"ORDER BY id_obs DESC";
					tx.executeSql(sql, [], function(tx, results) {
						var obs = new Array(),
							id = (results.rows.length == 0) ? 1 : results.rows.item(0).id_obs+1;
							sql =
								"INSERT INTO obs " +
								"(id_obs, " + 
								" date, latitude, longitude, commune, code_insee, " + 
								" lieu_dit, station, milieu, " +
								" certitude, abondance, phenologie, " +
								" mise_a_jour, ce_espece, texte_libre, ref_libre) VALUES " + 
								"(?, " + 
								" ?, ?, ?, ?, ?, " +
								" ?, ?, ?, " +
								" ?, ?, ?, " +
								" ?, ?, ?, ?) ";
							
						obs.push(id);
						obs.push($('#date').html());
						obs.push($('#lat_field').html());
						obs.push($('#lng_field').html());
						obs.push($('#location').html());
						obs.push($('#code_insee').val());
						obs.push($('#lieudit').val());
						obs.push($('#station').val());
						obs.push($('#milieu').val());
						obs.push($('#certitude').val());
						obs.push($('#abondance').val());
						obs.push($('#stade_ph').val());
						obs.push(($('#code_insee').val() > 0) ? 1 : 0);
						obs.push($('#num_nom_select').val());
						obs.push(($('#num_nom_select').val() == -1) ? $('#taxon-choisi').html() : 'NULL');
						obs.push(($('#num_nom_select').val() == -1) ? $('#referentiel').val() : 'NULL');
						tx.executeSql(sql, obs);
						$('#sauvegarde-obs-modal').modal('show');
						
						
						var i = 0,
							parent = document.getElementById('obs-photos'),
							imgs = parent.getElementsByTagName('img');
						
						sql =
							"SELECT id_photo " +
							"FROM photo " + 
							"ORDER BY id_photo DESC";
						tx.executeSql(sql, [], function(tx, results) {
							var sql_photo =
									"INSERT INTO photo " +
									"(id_photo, chemin, ce_obs) VALUES " + 
									"(?, ?, ?)",
								id_photo = (results.rows.length == 0) ? 1 : results.rows.item(0).id_photo + 1;

							for (; i < imgs.length; i++) {
								var photo = new Array();
									photo.push(id_photo++);
									photo.push(imgs[i].src);
									photo.push(id);
								tx.executeSql(sql_photo, photo);
							}
						},
						function(error) {
							alert('DB | Error processing SQL: ' + error);
						});
					});
				},
				function(error) {
					console.log('DB | Error processing SQL: ' + error.code, error);
				});
			} else {
				$('#sauvegarde-obs-info').removeClass('hide')
					.fadeIn(0)
					.delay(1600)
					.fadeOut('slow');	
			}
		});
		$('#content').on('click', '.suppression-obs', function() {
			supprimerObs(this.id, true);
			window.location = '#transmission';
		});
		$('#content').on('click', '.supprimer-obs-transmises', function() {
			___CEL.db.transaction(function(tx) {
				var sql =
					"SELECT id_obs " +
					"FROM obs " + 
					"WHERE a_ete_transmise = 1";
				tx.executeSql(sql, [], function(tx, results) {
					for (var i = 0; i < results.rows.length; i = i + 1) {
						supprimerObs(results.rows.item(i).id_obs, false);
					}
					$('#obs-transmises-infos').html('');
				});
			},
			function(error) {
				console.log('DB | Error processing SQL: ' + error.code, error);
				var txt = 'Erreur de suppression dans la base de données.';
				$('#obs-suppression-infos').html('<p class="text-center alert alert-error alert-block">' + txt + '</p>')
					.fadeIn(0)
					.delay(1600)
					.fadeOut('slow');	
			});
		});
		
		
		$('#content').on('click', '.ajouter-photos', function(event) {
			var options = { 
				destinationType: destinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG
			};
			if (this.id == 'chercher-photos') {
				options.sourceType = pictureSource.PHOTOLIBRARY;
			}
			navigator.camera.getPicture(
				onPhotoSuccess, 
				function(message){
					//alert('Erreur camera: ' + message);
					console.log('CAMERA failed because: ' + message);
				},
				options
			);
		});
		$('#content').on('click', '.supprimer-photos', function() {
			var id = this.id;
			___CEL.db.transaction(function(tx) {
				tx.executeSql("DELETE FROM photo WHERE id_photo = " + id);
				
				var fichier = new FileEntry();
				fichier.fullPath = $('#img_'+id).attr('src');
				fichier.remove(null, null);
				
				$('#elt_'+id).remove();
				$('#nbre-photos').html($('#nbre-photos').html()-1);
				$('.ajouter-photos').removeClass('hide');
				if ($('#nbre-photos').html() == 0) {
					$('#prendre-photos-texte').html('Ajouter une photo...');
				}
			},
			function(error) {
				console.log('DB | Error processing SQL: ' + error.code, error);
				$('#obs-photos-info').addClass('alert-error');
				$('#obs-photos-info').removeClass('alert-success');
				$('#obs-photos-info').html('Erreur de suppression dans la base de données.')
					.fadeIn(0)
					.delay(1600)
					.fadeOut('slow');
			});
		});
		
		
		$('#content').on('keypress', '#courriel', function(event) {
			if (event.which == 13) {
				requeterIdentite(event);
			}
		});
		$('#content').on('click', '#valider_courriel', requeterIdentite);
		$('#content').on('click', '.transmettre-obs', function(event) {
			$('#compte-modal').modal('show');
		});
		$('#content').on('click', '#transmettre_courriel', function(event) {
				$('#nbre_obs').html('0');
				$('#obs-transmission-infos').html('');
				$('#compte-modal').modal('hide');
				$('#transmission-modal').modal('show');
				transmettreObs();
		});
		$('#content').on('keyup', '#courriel', function(event) {
			$('#valider_courriel').removeClass('hide');
			$('#transmettre_courriel').addClass('hide');
		});
		
		
		$('.fermer-obs-modal').on('click', function(event) {
			$('#sauvegarde-obs-modal').modal('hide');
		});
		
		
		// Check of browser supports touch events...
		if (document.documentElement.hasOwnProperty('ontouchstart')) {
			// ... if yes: register touch event listener to change the "selected" state of the item
			$('#content').on('touchstart', 'a', function(event) {
				self.selectItem(event);
			});
			$('#content').on('touchend', 'a', function(event) {
				self.deselectItem(event);
			});
		} else {
			// ... if not: register mouse events instead
			$('#content').on('mousedown', 'a', function(event) {
				self.selectItem(event);
			});
			$('#content').on('mouseup', 'a', function(event) {
				self.deselectItem(event);
			});
		}
		this.searchPage = new ___CEL.views.saisieObs();
		this.searchPage.render();
		self.slidePage(this.searchPage);
		$(this.searchPage.el).attr('id', 'searchPage');
	},
	
	saisie: function() {
		var self = this;
		self.slidePage(new ___CEL.views.saisieObs().render());
	},
			
	selectItem: function(event) {
		$(event.target).addClass('tappable-active');
	},
	
	deselectItem: function(event) {
		$(event.target).removeClass('tappable-active');
	},
	
	detailsObs: function(id_obs) {
		var obs = new ___CEL.models.Obs({ id: id_obs }),
			self = this;
		obs.fetch({
			success: function(data) {
				self.slidePage(new ___CEL.views.ObsPage({model: data}).render());
			}
		});
	},

	transmissionObs: function(data) {
		this.slidePage(new ___CEL.views.transmissionObs().render());
	},
	

	slidePage: function(page) {
		var slideFrom,
			self = this;

		// If there is no current page (app just started) -> No transition: Position new page in the view port
		if (!this.currentPage) {
			$(page.el).attr('class', 'page stage-center');
			$('#content').append(page.el);
			this.pageHistory = [window.location.hash];
			this.currentPage = page;
			return;
		}

		// Cleaning up: remove old pages that were moved out of the viewport
		$('.stage-right, .stage-left').not('#searchPage').remove();

		if (page === this.searchPage) {
			// Always apply a Back (slide from left) transition when we go back to the search page
			slideFrom = 'left';
			$(page.el).attr('class', 'page stage-left');
			// Reinitialize page history
			this.pageHistory = [window.location.hash];
		} else if (this.pageHistory.length > 1 && window.location.hash === this.pageHistory[this.pageHistory.length - 2]) {
			// The new page is the same as the previous page -> Back transition
			slideFrom = 'left';
			$(page.el).attr('class', 'page stage-left');
			this.pageHistory.pop();
		} else {
			// Forward transition (slide from right)
			slideFrom = 'right';
			$(page.el).attr('class', 'page stage-right');
			this.pageHistory.push(window.location.hash);
		}

		$('#content').html(page.el);

		// Wait until the new page has been added to the DOM...
		setTimeout(function() {
			// Slide out the current page: If new page slides from the right -> slide current page to the left, and vice versa
			$(self.currentPage.el).attr('class', 'page transition ' + (slideFrom === "right" ? 'stage-left' : 'stage-right'));
			// Slide in the new page
			$(page.el).attr('class', 'page stage-center transition');
			self.currentPage = page;
		});

	}

});

// Bootstrap the application
___CEL.db = window.openDatabase('FloraDataApps', '1.0', 'Data Base Saisie Flora Data', 1024*1024*30);
___CEL.storage = window.localStorage;

$().ready(function() {
	if (___CEL.storage.getItem('version') != VERSION_APP) {
		(new ___CEL.dao.EspeceDAO(___CEL.db)).populate();
		(new ___CEL.dao.ObsDAO(___CEL.db)).populate();
		(new ___CEL.dao.PhotoDAO(___CEL.db)).populate();
		(new ___CEL.dao.UtilisateurDAO(___CEL.db)).populate();
		
		___CEL.storage.setItem('version', VERSION_APP);
	}
	___CEL.utils.templateLoader.load(
		['obs-liste', 'obs-page', 'obs-saisie'],
		function() {
			___CEL.app = new ___CEL.Router();
			Backbone.history.start();
		}
	);
});



function supprimerObs(id, flag) {
	___CEL.db.transaction(function(tx) {
		var sql =
			"SELECT id_photo, chemin " +
			"FROM photo " + 
			"WHERE ce_obs = " + id;
		tx.executeSql(sql, [], function(tx, results) {
			for (var i = 0; i < results.rows.length; i = i + 1) {
				var fichier = new FileEntry();
				fichier.fullPath = results.rows.item(i).chemin;
				fichier.remove(null, null);
				tx.executeSql("DELETE FROM photo WHERE id_photo = " + results.rows.item(i).id_photo);
			}
		});
		tx.executeSql("DELETE FROM obs WHERE id_obs = " + id);
		
		if (flag) {
			var txt = 'Observation n° ' + id + ' supprimée.';
			$('#obs-suppression-infos').html('<p class="text-center alert alert-success alert-block">'+txt+'</p>')
				.fadeIn(0)
				.delay(1600)
				.fadeOut('slow');
		}		

		if ($('#'+id).hasClass('a-transmettre')) {
			var nbre = parseInt($('#nbre-a-transmettre').html()) - 1;
			$('#nbre-a-transmettre').html(nbre);
			if (nbre < 3) {
				$('#obs-a-transmettre-btn').addClass('hide');
			}
			if (nbre == 0) {
				$('.transmettre-obs').addClass('hide');
			}
		} else {
			if ($('#'+id).hasClass('transmises')) {
				var nbre = parseInt($('#nbre-transmises').html()) - 1;
				$('#nbre-transmises').html(nbre);
				if (nbre == 0) {
					$('#obs-transmises-infos').addClass('hide');
				}
			}
		}
		$('#li_'+id).remove();
	},
	function(error) {
		console.log('DB | Error processing SQL: ' + error.code, error);
		var txt = 'Erreur de suppression dans la base de données.';
		$('#obs-suppression-infos').html('<p class="text-center alert alert-error alert-block">' + txt + '</p>')
			.fadeIn(0)
			.delay(1600)
			.fadeOut('slow');	
	});
}
function miseAJourTransmission(id) {
	___CEL.db.transaction(function(tx) {
		var sql =
			"UPDATE obs " +
			"SET a_ete_transmise = 1 " +
			"WHERE id_obs = :id_obs ";
		tx.executeSql(sql, [id]);
	},
	function(error) {
		console.log('DB | Error processing SQL: ' + error.code, error);
	});
}



function onPhotoSuccess(imageData){
	fileSystem.root.getDirectory(REPERTOIRE, { create: true, exclusive: false }, function(dossier) {
		var fichier = new FileEntry();
		fichier.fullPath = imageData;
		fichier.copyTo(dossier, (new Date()).getTime()+'.jpg', surPhotoSuccesCopie, surPhotoErreurAjout);
	}, surPhotoErreurAjout);
}
function surPhotoSuccesCopie(entry) {
	___CEL.db.transaction(function(tx) {
		var hash = window.location.hash,
			ce_obs = hash[hash.length - 1],
			chemin = entry.fullPath,
			id = Math.floor(Math.random()*100),
			nbre_photos = parseInt($('#nbre-photos').html()) + 1 ,
			elt = 
				'<div class="pull-left miniature text-center" id="elt_' + id + '">' + 
					'<img src="' + chemin + '" alt="' + id + '" id="img_' + id + '"/>' +
					'<span id="' + id + '" class="suppression-element supprimer-photos"><span></span></span>' + 
				'</div>';
		$('#obs-photos').append(elt);
		$('#nbre-photos').html(nbre_photos);
		$('#prendre-photos-texte').html('Prendre une autre photo...');
		if (nbre_photos == LIMITE_NBRE_PHOTOS) {
			$('.ajouter-photos').addClass('hide');
		}
	},
	surPhotoErreurAjout);
}
function surPhotoErreurAjout(error) {
	$('#obs-photos-info').addClass('text-error');
	$('#obs-photos-info').removeClass('text-info');
	$('#obs-photos-info').html('Erreur de traitement. Ajout impossible.');
	alert('PHOTO | Error: ' + error.code, error);
	console.log('PHOTO | Error: ' + error.code, error);
}
function surPhotoErreurSuppression(error) {
	var texte = 'Erreur de traitement. Le fichier n\'a pas été supprimé de la mémoire.';
	$('#obs-photos-info').html('<p class="text-center alert alert-error alert-block">' + texte +'</p>')
		.fadeIn(0)
		.delay(1600)
		.fadeOut('slow');
}



function geolocaliser() {
	$('#geo-infos').html('Calcul en cours...');
	$('#obs-attente-icone').removeClass('hide');
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(surSuccesGeoloc, surErreurGeoloc);
	} else {
		var erreur = { code: '0', message: 'Géolocalisation non supportée par le navigateur.'};
		surErreurGeoloc(erreur);
	}
}
function surSuccesGeoloc(position) {
	if (position) {
		var lat = position.coords.latitude,
			lng = position.coords.longitude;
		$('#lat_field').html(lat);
		$('#lng_field').html(lng);
		
		var url_service = SERVICE_NOM_COMMUNE_URL;
		var urlNomCommuneFormatee = url_service.replace('{lat}', lat).replace('{lon}', lng);
		$.ajax({
			url : urlNomCommuneFormatee,
			type : 'GET',
			dataType : 'jsonp',
			success : function(data) {
				console.log('NOM_COMMUNE found.');
				$('#location').html(data['nom']);
				$('#code_insee').val(data['codeINSEE']);
			},
			complete : function() { 
				var texte = ($('#location').html() == '') ? TEXTE_HORS_LIGNE : $('#location').html();
				$('#location').html(texte);
			}
		});
		
		$('#geo-infos').html(''); 
		console.log('Geolocation SUCCESS');
	} else {
		$('#geo-infos').addClass('text-error');
		$('#geo-infos').removeClass('text-info');
		$('#geo-infos').html('Impossible de continuer l\'enregistrement.'); 
	}
	$('#obs-attente-icone').addClass('hide');
}
function surErreurGeoloc(error){
	$('#obs-attente-icone').addClass('hide');
	$('#geo-infos').addClass('text-error');
	$('#geo-infos').removeClass('text-info');
	$('#geo-infos').html('Calcul impossible.');
	console.log('Echec de la géolocalisation, code: ' + error.code + ' message: '+ error.message);
}



function requeterIdentite() {
	var courriel = ($('#courriel').val()).toLowerCase();
	if (validerCourriel(courriel)) {
		$('#utilisateur-infos').addClass('text-info');
		$('#utilisateur-infos').removeClass('text-error');
		$('#utilisateur-infos').html('Vérification en cours...');
		var urlAnnuaire = SERVICE_ANNUAIRE + courriel;
		$.ajax({
			url : urlAnnuaire,
			type : 'GET', 
			success : function(data, textStatus, jqXHR) {
				console.log('Annuaire SUCCESS: ' + textStatus);
				$('#utilisateur-infos').html('');
				if (data != undefined && data[courriel] != undefined) {
					var infos = data[courriel];
					$('#id_utilisateur').val(infos.id);
					$('#prenom_utilisateur').val(infos.prenom);
					$('#nom_utilisateur').val(infos.nom);
					$('#courriel_confirmation').val(courriel);
					
					surSuccesCompletionCourriel();
				} else {
					if ($('#courriel_confirmation').val() != courriel) {
						surErreurCompletionCourriel('Compte inexistant.');
					} else {
						surSuccesCompletionCourriel();
					}
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log('Annuaire ERROR: ' + textStatus);
				surErreurCompletionCourriel('Echec de la vérification.');
			},
			complete : function(jqXHR, textStatus) {
				miseAJourCourriel(courriel);
				console.log('Annuaire COMPLETE: ' + textStatus);
			}
		});
	} else {
		$('#utilisateur-infos').addClass('text-error');
		$('#utilisateur-infos').removeClass('text-info');
		$('#utilisateur-infos').html('Courriel invalide.');
	}
}
function validerCourriel(email) { 
	var regex = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i),
		flag = regex.test(email);
	
	console.log('Valid email ? (', email, ') : ', flag);
	return flag;
} 
function miseAJourCourriel(courriel) {
	___CEL.db.transaction(function(tx) {
		var parametres = new Array(),
			sql = 
				"INSERT INTO utilisateur " +
				"(compte_verifie, id_user, email) VALUES " + 
				"(?, ?, ?)";
		parametres.push($('#courriel_confirmation').val() == courriel);
		parametres.push(1);
		parametres.push(courriel);
	
		tx.executeSql('DELETE FROM utilisateur');
		tx.executeSql(sql, parametres);
	},
	function(error) {
		console.log('DB | Error processing SQL: ' + error.code, error);
	});
}
function surSuccesCompletionCourriel() {
	$('#transmettre_courriel').removeClass('hide');
	$('#valider_courriel').addClass('hide');
	$('#zone_courriel_confirmation').addClass('hide');
}
function surErreurCompletionCourriel(texte) {
	$('#utilisateur-infos').addClass('text-error');
	$('#utilisateur-infos').removeClass('text-info');
	$('#utilisateur-infos').html(texte);
	$('#zone_courriel_confirmation').removeClass('hide');
	//$('#courriel_confirmation').val('');
}



var arr_obs = new Array();
function transmettreObs() {
	var msg = '';
	if (verifierConnexion()) {	
		___CEL.db.transaction(function(tx) {
			var sql = 
				"SELECT num_nom, nom_sci, num_nom_retenu, nom_sci_retenu, num_taxon, famille, referentiel, " + 
					"lieu_dit, station, milieu, certitude, abondance, phenologie, " +
					"id_obs, latitude, longitude, date, commune, code_insee, mise_a_jour, " +
					"texte_libre, ref_libre, ce_espece " +
				"FROM espece " +
				"JOIN obs ON num_nom = ce_espece " +
				"WHERE a_ete_transmise = '0' " + 
				"ORDER BY id_obs " +
				"LIMIT " + LIMITE_NBRE_TRANSMISSION;
			tx.executeSql(sql, [], function(tx, results) {
				var nbre_obs = results.rows.length;
				$('#total_obs').html(nbre_obs);	
				for (var i = 0; i < nbre_obs; i = i + 1) {
					var id = results.rows.item(i).id_obs;
					arr_obs[id] = results.rows.item(i);
					enregistrerPhotosObs(id);
				}
			},
			function(error) {
				console.log('DB | Error processing SQL: ' + error.code, error);
			});
		},
		function(error) {
			console.log('DB | Error processing SQL: ' + error.code, error);
		});
	} else {
		msg = 'Aucune connexion disponible. Merci de réessayer ultérieurement.';
	}
		
	if (msg != '') {
		$('#details-obs').html('<p class="alert alert-info alert-block">' + msg + '</p>')
			.fadeIn(0)
			.delay(2000)
			.fadeOut('slow');
	}
}
function verifierConnexion() {
	return ( ('onLine' in navigator) && (navigator.onLine) );
}
function enregistrerPhotosObs(identifiant) {
	var	k = 0,
		img_noms = new Array(),
		img_codes = new Array(),
		arr_photos = new Array();
	___CEL.db.transaction(function(tx) {
		tx.executeSql("SELECT * FROM photo WHERE ce_obs = ?", [identifiant], function(tx, results) {
			var photo = null,
				nbre_photos = results.rows.length;
			
			if (nbre_photos == 0) {
				construireObs(identifiant, img_codes, img_noms);
			} else {
				for (var j = 0; j < nbre_photos; j++) {
					photo = results.rows.item(j);
					arr_photos.push(results.rows.item(j));
					
					var fichier = new FileEntry();
					fichier.fullPath = arr_photos[arr_photos.length-1].chemin;
					fichier.file(
						function(file) {
							var reader = new FileReader();
							reader.onerror = function(error) {
								alert('Erreur de la lecture de l\'image.');
							};
							reader.onloadend = function(evt) {
								k++;
								img_codes.push(evt.target.result);
								img_noms.push(file.name);
								
								if (k == nbre_photos) {
									construireObs(identifiant, img_codes, img_noms);
								}
							};
							reader.readAsDataURL(file);
						}, function(error) {
							alert('Fichier inaccessible.');
						}
					);
				}
			}
		}, null);
	});
}
function construireObs(id, img_codes, img_noms) {
	var obs = arr_obs[id],
		json = {
			'date' : obs.date, 
			'notes' : '',
			
			'nom_sel' : (obs.ce_espece == -1) ? obs.texte_libre : obs.nom_sci,
			'num_nom_sel' : obs.num_nom,
			'nom_ret' : (obs.ce_espece == -1) ? obs.texte_libre : obs.nom_sci,
			'num_nom_ret' : obs.num_nom,
			//'nom_ret' : obs.nom_sci_retenu,
			//'num_nom_ret' : obs.num_nom_retenu,
			'num_taxon' : obs.num_taxon,
			'famille' : obs.famille,
			'referentiel' : (obs.ce_espece == -1) ? obs.ref_libre : obs.referentiel,
			
			'latitude' : obs.latitude,
			'longitude' : obs.longitude,
			'commune_nom' : obs.commune,
			'commune_code_insee' : obs.code_insee,
			'lieudit' : obs.lieu_dit,
			'station' : obs.station,
			'milieu' : obs.milieu,
			'abondance' : obs.abondance,
			'phenologie' : obs.phenologie,
			'certitude' : obs.certitude,
			
			//Ajout des champs images
			'image_nom' : img_noms,
			'image_b64' : img_codes 
		};
	jQuery.data($('div')[0], ''+obs.id_obs, json);
	var msg = '',
		observations = { 'obsId1' : jQuery.data($('div')[0], ''+obs.id_obs) };
	if (observations == undefined || jQuery.isEmptyObject(observations)) {
		msg = 'Aucune observation à transmettre.';
	} else {
		msg = 'Transmission en cours...';
		observations['projet'] = TAG_PROJET;
		observations['tag-obs'] = TAG_OBS;
		observations['tag-img'] = TAG_IMG;
		
		var utilisateur = new Object();
		utilisateur.id_utilisateur = null;
		utilisateur.prenom = null;
		utilisateur.nom = null;
		utilisateur.courriel = $('#courriel').val();
		observations['utilisateur'] = utilisateur;
		
		envoyerObsAuCel(observations, obs.id_obs);	
	}
	
	$('#details-obs').removeClass('hide');
	$('#details-obs').html(msg)
		.fadeIn(0)
		.delay(2000)
		.fadeOut('slow');
}
function envoyerObsAuCel(obs, id_obs) {
	console.log(obs);
	
	var msg = '',
		erreurMsg = '';
	$.ajax({
		url : SERVICE_SAISIE_URL,
		type : 'POST',
		data : obs,
		dataType : 'json',
		success : function(data, textStatus, jqXHR) {
			console.log('Transmission SUCCESS.');
			$('#nbre_obs').html(parseInt($('#nbre_obs').html()) + 1);
			$('#details-obs').addClass('alert-success');
			
			msg = 'Transmission réussie ! Merci ! <br /><br />'
			+ 'Vos observations contribuent désormais au programme Flora Data et nous vous en remercions.'
			+ 'Elles sont visibles sur le site de Tela Botanica, et vous pouvez les modifier ou les supprimer en vous rendant sur votre Carnet en Ligne.';
			miseAJourTransmission(id_obs);
		},
		statusCode : {
			500 : function(jqXHR, textStatus, errorThrown) {
				msg = 'Erreur 500. Merci de contacter le responsable.';
				erreurMsg += 'Erreur 500 :\ntype : ' + textStatus + '\n' + errorThrown + '\n';
				afficherMsgTransmission(msg);
			}
		},
		error : function(jqXHR, textStatus, errorThrown) {
			$('#details-obs').addClass('alert-error');
			msg = 'Erreur indéterminée. Merci de contacter le responsable.';
			erreurMsg += 'Erreur Ajax de type : ' + textStatus + '\n' + errorThrown + '\n';
			try {
				var reponse = jQuery.parseJSON(jqXHR.responseText);
				if (reponse != null) {
					$.each(reponse, function (cle, valeur) {
						erreurMsg += valeur + '\n';
					});
				}
			} catch(e) {
				erreurMsg += 'L\'erreur n\'était pas en JSON.';
			}
			console.log(erreurMsg);
			afficherMsgTransmission(msg);
		},
		complete : function(jqXHR, textStatus) {
			console.log('Transmission COMPLETE.');
			if ($('#total_obs').html() == $('#nbre_obs').html()) {
				afficherMsgTransmission(msg);
			}
		}
	});
}
function afficherMsgTransmission(msg) {
	$('#obs-transmission-texte').addClass('hide');
	$('#obs-transmission-btn').removeClass('hide');
	$('#obs-transmission-infos').html('<p>' + msg + '</p>');
}
