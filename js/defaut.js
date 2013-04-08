//+---------------------------------------------------------------------------------------------------------+
// GÉNÉRAL
$(document).ready(function() {
	$(window).on('beforeunload', function(event) {
		return 'Êtes vous sûr de vouloir quiter la page?\nLes observations saisies mais non transmises seront perdues.';
	});
});
//+----------------------------------------------------------------------------------------------------------+
// FONCTIONS GÉNÉRIQUES
/**
 * Stope l'évènement courrant quand on clique sur un lien.
 * Utile pour Chrome, Safari...
 * @param evenement
 * @return
 */
function arreter(evenement) {
	if (evenement.stopPropagation) {
		evenement.stopPropagation();
	}
	if (evenement.preventDefault) {
		evenement.preventDefault();
	}
	return false;
}

function extraireEnteteDebug(jqXHR) {
	var msgDebug = '';
	if (jqXHR.getResponseHeader("X-DebugJrest-Data") != '') {
		var debugInfos = jQuery.parseJSON(jqXHR.getResponseHeader("X-DebugJrest-Data"));
		if (debugInfos != null) {
			$.each(debugInfos, function (cle, valeur) {
				msgDebug += valeur + "\n";
			});
		}
	}
	return msgDebug;
}

function afficherPanneau(selecteur) {
	$(selecteur).fadeIn("slow").delay(DUREE_MESSAGE).fadeOut("slow");
}

//+----------------------------------------------------------------------------------------------------------+
//UPLOAD PHOTO : Traitement de l'image 
$(document).ready(function() {
	
	$("#effacer-miniature").click(function () {
		supprimerMiniature();
	});
	
	if (HTML5 && window.File && window.FileReader && isCanvasSupported()) {
		if (DEBUG) {
			console.log("Support OK pour : API File et Canvas.");
		}
		$('#fichier').bind('change', function(e) {
			afficherMiniatureHtml5(e);
		});	
	} else {
		$("#fichier").bind('change', function (e) {
			arreter(e);
			var options = { 
				success: afficherMiniature, // post-submit callback 
				dataType: 'xml', // 'xml', 'script', or 'json' (expected server response type) 
				resetForm: true // reset the form after successful submit 
			};
			$("#miniature").append('<img id="miniature-chargement" class="miniature" alt="chargement" src="'+CHARGEMENT_IMAGE_URL+'"/>');
			$("#ajouter-obs").attr('disabled', 'disabled');
			$("#form-upload").ajaxSubmit(options);
			return false;
		});
	}
	
	if(ESPECE_IMPOSEE) {
		$("#taxon").attr("disabled", "disabled");
		$("#taxon-input-groupe").attr("title","");
		var infosAssociee = new Object();
		infosAssociee.label = INFOS_ESPECE_IMPOSEE.nom_sci_complet;
		infosAssociee.value = INFOS_ESPECE_IMPOSEE.nom_sci_complet;
		infosAssociee.nt = INFOS_ESPECE_IMPOSEE.num_taxonomique;
		infosAssociee.nomSel = INFOS_ESPECE_IMPOSEE.nom_sci;
		infosAssociee.nomSelComplet = INFOS_ESPECE_IMPOSEE.nom_sci_complet;
		infosAssociee.numNomSel = INFOS_ESPECE_IMPOSEE.id;
		infosAssociee.nomRet = INFOS_ESPECE_IMPOSEE["nom_retenu.libelle"];
		infosAssociee.numNomRet = INFOS_ESPECE_IMPOSEE["nom_retenu.id"];
		infosAssociee.famille = INFOS_ESPECE_IMPOSEE.famille;
		infosAssociee.retenu = (INFOS_ESPECE_IMPOSEE.retenu == 'false') ? false : true;
		$("#taxon").data(infosAssociee);
	}
});

function isCanvasSupported(){
	var elem = document.createElement('canvas');
	return !!(elem.getContext && elem.getContext('2d'));
}

function afficherMiniatureHtml5(evt) {
	supprimerMiniature();
	
	var selectedfiles = evt.target.files;
	var f = selectedfiles[0];// Nous récupérons seulement le premier fichier.
	if (f.type != 'image/jpeg') {
		var message = "Seule les images JPEG sont supportées.";
		$("#miniature-msg").append(message);
	} else if (f.size > 5242880) {
		var message = "Votre image à un poids supérieur à 5Mo.";
		$("#miniature-msg").append(message);
	} else {
		var reader = new FileReader();
		// Lit le fichier image commune url de données
		reader.readAsDataURL(f);
		var imgNom = f.name;
	
		// Closure pour capturer les infos du fichier
		reader.onload = (function(theFile) {
			return function(e) {
				// Rendre la miniature
				var imageBase64 = e.target.result;
				//$("#miniature").append('<img id="miniature-img" class="miniature b64" src="'+imageBase64+'" alt="'+imgNom+'"/>');
				
				// HTML5 Canvas
				var img = new Image();
			    img.src = imageBase64;
			    img.alt = imgNom;
			    img.onload = function() {
			    	transformerImgEnCanvas(this, 100, 100, false, 'white');
			    };
			};
		})(f);
	}
	$("#effacer-miniature").show();
}

function transformerImgEnCanvas(img, thumbwidth, thumbheight, crop, background) {
	var canvas = document.createElement('canvas');
	canvas.width = thumbwidth;
	canvas.height = thumbheight;
	var dimensions = calculerDimenssions(img.width, img.height, thumbwidth, thumbheight);
	if (crop) {
		canvas.width = dimensions.w;
		canvas.height = dimensions.h;
		dimensions.x = 0;
		dimensions.y = 0;
	}
	cx = canvas.getContext('2d');
	if (background !== 'transparent') {
		cx.fillStyle = background;
		cx.fillRect(0, 0, thumbwidth, thumbheight);
	}
	cx.drawImage(img, dimensions.x, dimensions.y, dimensions.w, dimensions.h);
	afficherMiniatureCanvas(img, canvas);
}

function calculerDimenssions(imagewidth, imageheight, thumbwidth, thumbheight) {
	var w = 0, h = 0, x = 0, y = 0,
	    widthratio = imagewidth / thumbwidth,
	    heightratio = imageheight / thumbheight,
	    maxratio = Math.max(widthratio, heightratio);
	if (maxratio > 1) {
	    w = imagewidth / maxratio;
	    h = imageheight / maxratio;
	} else {
	    w = imagewidth;
	    h = imageheight;
	}
	x = (thumbwidth - w) / 2;
	y = (thumbheight - h) / 2;
	return {w:w, h:h, x:x, y:y};
}

function afficherMiniatureCanvas(imgB64, canvas) {
	var url = canvas.toDataURL('image/jpeg' , 0.8);
	var alt = imgB64.alt;
	var title = Math.round(url.length / 1000 * 100) / 100 + ' KB';
	var miniature = '<img id="miniature-img" class="miniature b64-canvas" src="'+url+'" alt="'+alt+'" title="'+title+'" />';
	$("#miniature").append(miniature);
	$("#miniature-img").data('b64', imgB64.src);
}

function afficherMiniature(reponse) { 
	supprimerMiniature();
	if (DEBUG) {
		var debogage = $("debogage", reponse).text();
		console.log("Débogage upload : "+debogage);
	}
	var message = $("message", reponse).text();
	if (message != '') {
		$("#miniature-msg").append(message);
	} else {
		var miniatureUrl = $("miniature-url", reponse).text();
		var imgNom = $("image-nom", reponse).text();
		$("#miniature").append('<img id="miniature-img" class="miniature" alt="'+imgNom+'" src="'+miniatureUrl+'"/>');
	}
	$('#ajouter-obs').removeAttr('disabled');
	$("#effacer-miniature").show();		
}

function supprimerMiniature() {
	$("#miniature").empty();
	$("#miniature-msg").empty();
	$("#effacer-miniature").hide();
}
//+---------------------------------------------------------------------------------------------------------+
// IDENTITÉ
$(document).ready(function() {
	$("#courriel").on('blur', requeterIdentite);
	$("#courriel").on('keypress', testerLancementRequeteIdentite);
});

function testerLancementRequeteIdentite(event) {
	if (event.which == 13) {
		requeterIdentite();
		event.preventDefault();
		event.stopPropagation();
	}
}

function requeterIdentite() {
	var courriel = $("#courriel").val();
	//TODO: mettre ceci en paramètre de config
	var urlAnnuaire = "http://www.tela-botanica.org/client/annuaire_nouveau/actuelle/jrest/utilisateur/identite-par-courriel/"+courriel;//http://localhost/applications/annuaire/jrest/
	$.ajax({
		url : urlAnnuaire,
		type : "GET",
		success : function(data, textStatus, jqXHR) {
			console.log('SUCCESS:'+textStatus);
			if (data != undefined && data[courriel] != undefined) {
				var infos = data[courriel];
				$("#id_utilisateur").val(infos.id);
				$("#prenom").val(infos.prenom);
				$("#nom").val(infos.nom);
				$("#courriel_confirmation").val(courriel);
				$("#prenom, #nom, #courriel_confirmation").attr('disabled', 'disabled');
				$("#date").focus();
			} else {
				surErreurCompletionCourriel();
			}
		},
		error : function(jqXHR, textStatus, errorThrown) {
			console.log('ERREUR :'+textStatus);
			surErreurCompletionCourriel();
		},
		complete : function(jqXHR, textStatus) {
			console.log('COMPLETE :'+textStatus);
			$("#zone-prenom-nom").removeClass("hidden");
			$("#zone-courriel-confirmation").removeClass("hidden");
		}
	});
}

function surErreurCompletionCourriel() {
	$("#prenom, #nom, #courriel_confirmation").val('');
	$("#prenom, #nom, #courriel_confirmation").removeAttr('disabled');
	afficherPanneau("#dialogue-courriel-introuvable");
}
//+---------------------------------------------------------------------------------------------------------+
//FORMULAIRE VALIDATION
$(document).ready(function() {
	
	
});
//+---------------------------------------------------------------------------------------------------------+
// FORMULAIRE
var obsNbre = 0;

$(document).ready(function() {
	$(".alert .close").on('click', fermerPanneauAlert);
	
	$("[rel=tooltip]").tooltip('enable');
	$("#btn-aide").on('click', basculerAffichageAide);
	
	$("#prenom").on("change", formaterPrenom);
	
	$("#nom").on("change", formaterNom);
	
	ajouterAutocompletionNoms();
	
	configurerFormValidator();
	definirReglesFormValidator();
		
	$("#courriel_confirmation").on('paste', bloquerCopierCollerCourriel);
		
	$("a.afficher-coord").on('click', basculerAffichageCoord);
	
	$("#ajouter-obs").on('click', ajouterObs);
	
	$(".obs-nbre").on('changement', surChangementNbreObs);
	
	$("body").on('click', ".supprimer-obs", supprimerObs);
	
	$("#transmettre-obs").on('click', transmettreObs);
	
	$("#referentiel").on('change', surChangementReferentiel);
});

function configurerFormValidator() {
	$.validator.addMethod(
		"dateCel", 
		function (value, element) { 
			return value == "" || (/^[0-9]{2}[-\/][0-9]{2}[-\/][0-9]{4}$/.test(value)); 
		}, 
		"Format : jj/mm/aaaa. Date incomplète, utiliser 0, exemple : 00/12/2011.");
	$.extend($.validator.defaults, {
		errorClass: "control-group error",
		validClass: "control-group success",
		errorElement: "span",
		highlight: function(element, errorClass, validClass) {
			if (element.type === 'radio') {
				this.findByName(element.name).parent("div").parent("div").removeClass(validClass).addClass(errorClass);
			} else { 
				$(element).parent("div").parent("div").removeClass(validClass).addClass(errorClass);
			}
		},
		unhighlight: function(element, errorClass, validClass) {
			if (element.type === 'radio') {
				this.findByName(element.name).parent("div").parent("div").removeClass(errorClass).addClass(validClass);
			} else {
				if ($(element).attr('id') == 'taxon') {
					// Si le taxon n'est pas lié au référentiel, on vide le data associé
					if($("#taxon").data("value") != $("#taxon").val()) {
						$("#taxon").data("numNomSel","");
						$("#taxon").data("nomRet","");
						$("#taxon").data("numNomRet","");
						$("#taxon").data("nt","");
						$("#taxon").data("famille","");
					}
					$("#taxon-input-groupe").removeClass(errorClass).addClass(validClass);
					$(element).next(" span.help-inline").remove();
				} else {
					$(element).parent("div").parent("div").removeClass(errorClass).addClass(validClass);
					$(element).next(" span.help-inline").remove();
				}
			}
		}
	});
}

function definirReglesFormValidator() {
	$("#form-observateur").validate({
		rules: {
			courriel : {
				required : true,
				email : true},
			courriel_confirmation : {
				required : true,
				equalTo: "#courriel"}
		}
	});
	$("#form-station").validate({
		rules: {
			latitude : {
				range: [-90, 90]},
			longitude : {
				range: [-180, 180]}
		}
	});
	$("#form-obs").validate({
		rules: {
			date : "dateCel",
			taxon : "required"
		}
	});
}

function configurerDatePicker() {
	$.datepicker.setDefaults($.datepicker.regional["fr"]);
	$("#date").datepicker({
		dateFormat: "dd/mm/yy",  
		showOn: "button",
		buttonImageOnly: true,  
		buttonImage: CALENDRIER_ICONE_URL,
		buttonText: "Afficher le calendrier pour saisir la date.",
		showButtonPanel: true
	});
	$("img.ui-datepicker-trigger").appendTo("#date-icone");
}

function fermerPanneauAlert() {
	$(this).parentsUntil(".zone-alerte", ".alert").hide();
}

function formaterNom() {
	$(this).val($(this).val().toUpperCase());
}

function formaterPrenom() {
	var prenom = new Array();
	var mots = $(this).val().split(' ');
	for (var i = 0; i < mots.length; i++) {
		var mot = mots[i];
		if (mot.indexOf('-') >= 0) {
			var prenomCompose = new Array();
			var motsComposes = mot.split('-');
		    for (var j = 0; j < motsComposes.length; j++) {
		    	var motSimple = motsComposes[j];
		    	var motMajuscule = motSimple.charAt(0).toUpperCase() + motSimple.slice(1);
		    	prenomCompose.push(motMajuscule);
		    }
		    prenom.push(prenomCompose.join('-'));
		} else {
			var motMajuscule = mot.charAt(0).toUpperCase() + mot.slice(1);
			prenom.push(motMajuscule);
		}
	}
	$(this).val(prenom.join(' '));
}

function basculerAffichageAide()  {
	if ($(this).hasClass('btn-warning')) {
		$("[rel=tooltip]").tooltip('enable');
		$(this).removeClass('btn-warning').addClass('btn-success');
		$('#btn-aide-txt', this).text("Désactiver l'aide");
	} else {
		$("[rel=tooltip]").tooltip('disable');
		$(this).removeClass('btn-success').addClass('btn-warning');
		$('#btn-aide-txt', this).text("Activer l'aide");
	}
}

function bloquerCopierCollerCourriel() {
	afficherPanneau("#dialogue-bloquer-copier-coller");
	return false;
}

function basculerAffichageCoord() {
	$("a.afficher-coord").toggle();
	$("#coordonnees-geo").toggle('slow');
	//valeur false pour que le lien ne soit pas suivi
	return false;
}

function ajouterObs() {
	if (validerFormulaire() == true) {
		obsNbre = obsNbre + 1;
		$(".obs-nbre").text(obsNbre);
		$(".obs-nbre").triggerHandler('changement');
		afficherObs();
		stockerObsData();
		supprimerMiniature();
	} else {
		afficherPanneau('#dialogue-form-invalide');
	}
}

function afficherObs() {
	$("#liste-obs").prepend(
		'<div id="obs'+obsNbre+'" class="row-fluid obs obs'+obsNbre+'">'+
			'<div class="span12">'+
				'<div class="well">'+
					'<div class="obs-action pull-right" rel="tooltip" data-placement="bottom" '+
						'title="Supprimer cette observation de la liste à transmettre">'+
						'<button class="btn btn-danger supprimer-obs" value="'+obsNbre+'" title="'+obsNbre+'">'+
							'<i class="icon-trash icon-white"></i>'+
						'</button>'+
					'</div> '+		
					'<div class="row-fluid">'+	
						'<div class="thumbnail span2">'+
							ajouterImgMiniatureAuTransfert()+
						'</div>'+
						'<div class="span9">'+
							'<ul class="unstyled">'+
								'<li>'+
									'<span class="nom-sci">'+$("#taxon").val()+'</span> '+
									ajouterNumNomSel()+'<span class="referentiel-obs">'+
									($("#taxon").data("numNomSel") == undefined ? '' : '['+NOM_SCI_PROJET+']')+'</span>'+
									' observé à '+
									'<span class="commune">'+$('#commune-nom').text()+'</span> '+
									'('+$('#commune-code-insee').text()+') ['+$("#latitude").val()+' / '+$("#longitude").val()+']'+
									' le '+
									'<span class="date">'+$("#date").val()+'</span>'+
								'</li>'+
								'<li>'+
									'<span>Lieu-dit :</span> '+$('#lieudit').val()+' '+
									'<span>Station :</span> '+$('#station').val()+' '+
									'<span>Milieu :</span> '+$('#milieu').val()+' '+
								'</li>'+
								'<li>'+
									'Commentaires : <span class="discretion">'+$("#notes").val()+'</span>'+
								'</li>'+
							'</ul>'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>'+
		'</div>');
}

function stockerObsData() {
	$("#liste-obs").data('obsId'+obsNbre, {
		'date' : $("#date").val(), 
		'notes' : $("#notes").val(),
		
		'nom_sel' : $("#taxon").val(),
		'num_nom_sel' : $("#taxon").data("numNomSel"),
		'nom_ret' : $("#taxon").data("nomRet"),
		'num_nom_ret' : $("#taxon").data("numNomRet"),
		'num_taxon' : $("#taxon").data("nt"),
		'famille' : $("#taxon").data("famille"),
		'referentiel' : ($("#taxon").data("numNomSel") == undefined ? '' : NOM_SCI_REFERENTIEL),
		
		'latitude' : $("#latitude").val(),
		'longitude' : $("#longitude").val(),
		'commune_nom' : $("#commune-nom").text(),
		'commune_code_insee' : $("#commune-code-insee").text(),
		'lieudit' : $("#lieudit").val(),
		'station' : $("#station").val(),
		'milieu' : $("#milieu").val(),
		
		//Ajout des champs images
		'image_nom' : $("#miniature-img").attr('alt'),
		'image_b64' : getB64ImgOriginal()
	});
}

function surChangementReferentiel() {
	NOM_SCI_PROJET = $('#referentiel').val();
	NOM_SCI_REFERENTIEL = NOM_SCI_PROJET+':'+PROJETS_VERSIONS[NOM_SCI_PROJET];
	$('#taxon').val('');
}

function surChangementNbreObs() {
	if (obsNbre == 0) {
		$("#transmettre-obs").attr('disabled', 'disabled');
		$("#ajouter-obs").removeAttr('disabled');
	} else if (obsNbre > 0 && obsNbre < OBS_MAX_NBRE) {
		$("#transmettre-obs").removeAttr('disabled');
		$("#ajouter-obs").removeAttr('disabled');
	} else if (obsNbre >= OBS_MAX_NBRE) {
		$("#ajouter-obs").attr('disabled', 'disabled');
		afficherPanneau("#dialogue-bloquer-creer-obs");
	}
}

function transmettreObs() {
	var observations = $("#liste-obs").data();
	
	if (observations == undefined || jQuery.isEmptyObject(observations)) {
		afficherPanneau("#dialogue-zero-obs");
	} else {
		observations['projet'] = TAG_PROJET;
		observations['tag-obs'] = TAG_OBS;
		observations['tag-img'] = TAG_IMG;
		
		var utilisateur = new Object();
		utilisateur.id_utilisateur = $("#id_utilisateur").val();
		utilisateur.prenom = $("#prenom").val();
		utilisateur.nom = $("#nom").val();
		utilisateur.courriel = $("#courriel").val();
		observations['utilisateur'] = utilisateur;
		envoyerObsAuCel(observations);
	}
	return false;
}

function envoyerObsAuCel(observations) {
	var erreurMsg = "";
	$.ajax({
		url : SERVICE_SAISIE_URL,
		type : "POST",
		data : observations,
		dataType : "json",
		beforeSend : function() {
			$("#dialogue-obs-transaction-ko").hide();
			$("#dialogue-obs-transaction-ok").hide();
			$(".alert-txt .msg").remove();	
			$(".alert-txt .msg-erreur").remove();
			$(".alert-txt .msg-debug").remove();
			$("#chargement").show();
		},
		success : function(data, textStatus, jqXHR) {
			$('#dialogue-obs-transaction-ok .alert-txt').append($("#tpl-transmission-ok").clone().html());
			supprimerMiniature();
		},
		statusCode : {
			500 : function(jqXHR, textStatus, errorThrown) {
				erreurMsg += "Erreur 500 :\ntype : "+textStatus+' '+errorThrown+"\n";
		    }
		},
		error : function(jqXHR, textStatus, errorThrown) {
			erreurMsg += "Erreur Ajax :\ntype : "+textStatus+' '+errorThrown+"\n";
			try {
				reponse = jQuery.parseJSON(jqXHR.responseText);
				if (reponse != null) {
					$.each(reponse, function (cle, valeur) {
						erreurMsg += valeur + "\n";
					});
				}
			} catch(e) {
				erreurMsg += "L'erreur n'était pas en JSON.";
			}
		},
		complete : function(jqXHR, textStatus) {
			$("#chargement").hide();
			var debugMsg = extraireEnteteDebug(jqXHR);
			
			if (erreurMsg != '') {
				if (DEBUG) {
					$("#dialogue-obs-transaction-ko .alert-txt").append('<pre class="msg-erreur">'+erreurMsg+'</pre>');
					$("#dialogue-obs-transaction-ko .alert-txt").append('<pre class="msg-debug">Débogage : '+debugMsg+'</pre>');
				}
				var hrefCourriel = "mailto:cel@tela-botanica.org?"+
					"subject=Disfonctionnement du widget de saisie "+TAG_PROJET+
					"&body="+erreurMsg+"\nDébogage :\n"+debugMsg;
				
				$('#dialogue-obs-transaction-ko .alert-txt').append($("#tpl-transmission-ko").clone()
					.find('.courriel-erreur')
					.attr('href', hrefCourriel)
					.end()
					.html());
				$("#dialogue-obs-transaction-ko").show();
			} else {
				if (DEBUG) {
					$("#dialogue-obs-transaction-ok .alert-txt").append('<pre class="msg-debug">Débogage : '+debugMsg+'</pre>');
				}
				$("#dialogue-obs-transaction-ok").show();
			}
			initialiserObs();
		}
	});
}

function validerFormulaire() {
	$observateur = $("#form-observateur").valid();
	$station = $("#form-station").valid();
	$obs = $("#form-obs").valid();
	return ($observateur == true && $station == true && $obs == true) ? true : false;
}

function getB64ImgOriginal() {
	var b64 = '';
	if ($("#miniature-img").hasClass('b64')) {
		b64 = $("#miniature-img").attr('src');
	} else if ($("#miniature-img").hasClass('b64-canvas')) {
		b64 = $("#miniature-img").data('b64');
	}
	return b64;
}

function supprimerObs() {
	var obsId = $(this).val();
	// Problème avec IE 6 et 7
	if (obsId == "Supprimer") {
		obsId = $(this).attr("title");
	}
	obsNbre = obsNbre - 1;
	$(".obs-nbre").text(obsNbre);
	$(".obs-nbre").triggerHandler('changement');
	
	$('.obs'+obsId).remove();
	$("#liste-obs").removeData('obsId'+obsId);
}

function initialiserObs() {
	obsNbre = 0;
	$(".obs-nbre").text(obsNbre);
	$(".obs-nbre").triggerHandler('changement');
	$("#liste-obs").removeData();
	$('.obs').remove();
	$("#dialogue-bloquer-creer-obs").hide();
}

function ajouterImgMiniatureAuTransfert() {
	var miniature = '';
	if ($("#miniature img").length == 1) {
		var css = $("#miniature-img").hasClass('b64') ? 'miniature b64' : 'miniature';
		var src = $("#miniature-img").attr("src");
		var alt = $("#miniature-img").attr("alt");
		miniature = '<img class="'+css+' " alt="'+alt+'"src="'+src+'" />';
	} else {
		miniature = '<img class="miniature" alt="Aucune photo"src="'+PAS_DE_PHOTO_ICONE_URL+'" />';
	}
	return miniature;
}

function ajouterNumNomSel() {
	var nn = '';
	if ($("#taxon").data("numNomSel") == undefined) {
		nn = '<span class="alert-error">[non lié au référentiel]</span>';
	} else {
		nn = '<span class="nn">[nn'+$("#taxon").data("numNomSel")+']</span>';
	}
	return nn;
}

//+---------------------------------------------------------------------------------------------------------+
// AUTO-COMPLÉTION Noms Scientifiques

function ajouterAutocompletionNoms() {
	$('#taxon').autocomplete({
		source: function(requete, add){  
			// la variable de requête doit être vidée car sinon le parametre "term" est ajouté
			requete = "";
			var url = getUrlAutocompletionNomsSci();
			$.getJSON(url, requete, function(data) {  
				var suggestions = traiterRetourNomsSci(data);
				add(suggestions);  
            });
        },
        html: true
	});
		
	$( "#taxon" ).bind("autocompleteselect", function(event, ui) {
		$("#taxon").data(ui.item);
		if (ui.item.retenu == true) {
			$("#taxon").addClass('ns-retenu');
		} else {
			$("#taxon").removeClass('ns-retenu');
		}
	});
}

function getUrlAutocompletionNomsSci() {
	var mots = $('#taxon').val();
	var url = SERVICE_AUTOCOMPLETION_NOM_SCI_URL_TPL.replace('{referentiel}',NOM_SCI_PROJET);
	url = url.replace('{masque}', mots);
	return url;
}

function traiterRetourNomsSci(data) {
	var suggestions = [];  
	if (data.resultat != undefined) {
		$.each(data.resultat, function(i, val) {
			val.nn = i;
			var nom = {label : '', value : '', nt : '', nomSel : '', nomSelComplet : '', numNomSel : '',  
				nomRet : '', numNomRet : '', famille : '', retenu : false
			};
			if (suggestions.length >= AUTOCOMPLETION_ELEMENTS_NBRE) {
				nom.label = "...";
				nom.value = $('#taxon').val();
				suggestions.push(nom);
				return false;
			} else {
				nom.label = val.nom_sci_complet;
				nom.value = val.nom_sci_complet;
				nom.nt = val.num_taxonomique;
				nom.nomSel = val.nom_sci;
				nom.nomSelComplet = val.nom_sci_complet;
				nom.numNomSel = val.nn;
				nom.nomRet = val.nom_retenu_complet;
				nom.numNomRet = val["nom_retenu.id"];
				nom.famille = val.famille;
				nom.retenu = (val.retenu == 'false') ? false : true;
				
				suggestions.push(nom);
			}		
		});
	}
		
	return suggestions;
}

/*
 * jQuery UI Autocomplete HTML Extension
 *
 * Copyright 2010, Scott González (http://scottgonzalez.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * http://github.com/scottgonzalez/jquery-ui-extensions
 * 
 * Adaptation par Aurélien Peronnet pour la mise en gras des noms de taxons valides
 */
(function( $ ) {
	var proto = $.ui.autocomplete.prototype,
		initSource = proto._initSource;
	
	function filter( array, term ) {
		var matcher = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
		return $.grep( array, function(value) {
			return matcher.test( $( "<div>" ).html( value.label || value.value || value ).text() );
		});
	}
	
	$.extend( proto, {
		_initSource: function() {
			if ( this.options.html && $.isArray(this.options.source) ) {
				this.source = function( request, response ) {
					response( filter( this.options.source, request.term ) );
				};
			} else {
				initSource.call( this );
			}
		},
		_renderItem: function( ul, item) {
			if (item.retenu == true) {
				item.label = "<strong>"+item.label+"</strong>";
			}
			
			return $( "<li></li>" )
				.data( "item.autocomplete", item )
				.append( $( "<a></a>" )[ this.options.html ? "html" : "text" ]( item.label ) )
				.appendTo( ul );
		}
	});
})( jQuery );
