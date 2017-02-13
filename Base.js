//Same model, collection in same file for now because these modules rely on each other.

import _ from "underscore";
import Backbone from "backbone";
import Model from "./Model";
import Collection from "./Collection";
import View from "./View";

var Fajita = {Model, Collection, View};
Fajita["🌮"] = "1.0.0";

if (typeof window!=="undefined") window.Fajita = Fajita;
if (typeof global!=="undefined") global.Fajita = Fajita;