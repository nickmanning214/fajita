import $ from "jquery";
import Directive from "./directive";

export default Directive.extend({
    name:"optional",
    
    build:function(){
        if (!this.result) $(this.el).hide()
        else $(this.el).css("display","");
    },
    render:function(){
        if (!this.result) $(this.el).hide()
        else $(this.el).css("display","");
    },
    test:function(value){
        if (!document.body.contains(this.el)) throw Error("element has to be in the DOM in order to test")
        return $(this.el).is(":visible")==value;
    }
});
