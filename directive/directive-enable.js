//Why does underscore work here?

import Directive from "./directive";

export default Directive.extend({
    name:"enable",
    build:function(){
        if (!this.result) $(this.el).prop("disabled",true);
        else $(this.el).prop("disabled","");
    },
    render:function(){
        if (!this.result) $(this.el).prop("disabled",true);
        else $(this.el).prop("disabled","");
    },
    test:function(value){
        return $(this.el).prop("disabled")!=value;
    }
});
