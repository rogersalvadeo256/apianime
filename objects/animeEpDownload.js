module.exports= function(idEp,categoria,nomeEp, magnet,downloaded){
    this.idEp= idEp;
    this.categoria= categoria;
    this.nomeEp = nomeEp; 
    this.magnet= magnet;
    this.downloaded= downloaded===1;

}