import Directive from "./directive";

export default Directive.extend({
    name:"optionalwrap",
    childInit:function(){
        Directive.prototype.childInit.call(this,arguments);
        
        this.wrapper = this.el;
        this.childNodes = [].slice.call(this.el.childNodes, 0);
        
    },
    build:function(){
        if (!this.result) $(this.childNodes).unwrap();
    },
    render:function(){
        if (!this.result){
            $(this.childNodes).unwrap();
        }
        else {
           if (!document.body.contains(this.childNodes[0])){
                console.error("First child has to be in DOM");
                //solution: add a dummy text node at beginning
            }
            else if (!document.body.contains(this.wrapper)){
                this.childNodes[0].parentNode.insertBefore(this.wrapper,this.childNodes[0]);
            }
            for(var i=0;i<this.childNodes.length;i++){
                this.wrapper.appendChild(this.childNodes[i])
            }
        }
    },
    test:function(value){


        return (this.childNodes[0].parentNode==this.wrapper) == value;


      
    }
})