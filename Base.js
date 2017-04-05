//Same model, collection in same file for now because these modules rely on each other.

/*import _ from "underscore";*/
/*import Backbone from "backbone";*/
import Model from "./Model";
import ViewModel from "./ViewModel";
import Collection from "./Collection";
import View from "./View";
import DirectiveRegistry from "./directive/directiveRegistry";
/*import $ from "jquery";*/

var Fajita = {Model, ViewModel, Collection, View, DirectiveRegistry};
Fajita["🌮"] = "0.0.0";

if (typeof window!=="undefined") window.Fajita = Fajita;
if (typeof global!=="undefined") global.Fajita = Fajita;