/** @param {NS} ns **/
export async function main(ns){
	function round(num){return(Math.round(num*100)/100)}
	function difference(buyin,current)
	{
		var dif=current-buyin;
		var minus=dif<0.01;
		var one=buyin/100;
		dif=buyin-current;
		var a=round(dif/one);
		return(minus?-Math.abs(a):a)
	}
	var best=[];
	var args=ns.args;
	var volatility=[];
	var safetyOrders=[];
	var maxSafetyOrders=5;
	var safetyOrdersAmount=[];
	ns.tprint("Finding symbol...");
	var symbols=ns.stock.getSymbols();
	function format(num){return(ns.nFormat(num,"0,0"))}
	function getMax(numArray){return(Math.max.apply(null,numArray))}
	for(var x=0;x<symbols.length;x++)if(ns.stock.getForecast(symbols[x])>=0.6)best.push(symbols[x]);
	for(var x=0;x<best.length;x++)volatility.push(ns.stock.getVolatility(best[x])*100);
	var highest=getMax(volatility);
	var index=volatility.indexOf(highest);
	var sym=best[index];
	ns.tprint("Symbol: "+sym);
	var silent=args.length>2;
	ns.tprint(sym+"/> "+"Volatility: "+highest+"%");
	var profitPercentage=args.length?parseInt(args[0]):0;
	var money=args.length>1?parseInt(args[1]):Math.floor(ns.getPlayer().money*0.9);
	if(!silent)ns.tprint("Money: $"+format(money));
	if(money<1e7){
		ns.tprint(sym+"/> "+"You require a minimum of $10,000,000 to trade!");
		return
	}
	var ordered=0;
	var stockPrice=ns.stock.getAskPrice(sym);
	if(!silent)ns.tprint(sym+"/> "+"Stock price: $"+format(stockPrice));
	var totalStocks=Math.floor((money-1e5)/stockPrice);
	var perOrder=Math.floor(totalStocks/maxSafetyOrders+1);
	var maxStocks=ns.stock.getMaxShares(sym);
	if(perOrder>maxStocks)perOrder=Math.floor(maxStocks/maxSafetyOrders+1);
	var priceStocks=(stockPrice*perOrder)+1e5;
	var _priceStocks=ns.stock.getPurchaseCost(sym,perOrder,"Long");
	if(_priceStocks>money){
		ns.tprint(sym+"/> "+"Stock price changed -- not enough money");
		return
	}
	ordered+=perOrder;
	priceStocks=_priceStocks;
	var b=ns.stock.buy(sym,perOrder);
	if(!b){
		ns.tprint(sym+"/> "+"Purchase failed");
		return
	}else{
		var sold=false;
		var price=perOrder*b;
		var sellat=profitPercentage?b+(b*(profitPercentage/100)):0;
		for(var x=0;x<maxSafetyOrders;x++)safetyOrdersAmount[x]=b*-(Math.abs(highest)*(x*2));
		ns.tprint("Bought "+perOrder+" shares for $"+format(price)+" at $"+format(b)+" each");
		if(!silent)ns.tprint(sym+"/> "+"Waiting 6 seconds before every check");
		if(!silent)ns.tprint(" ");
		if(sellat)ns.tprint(sym+"/> "+"Sell at: $"+format(sellat));
		var prevPrice=ns.stock.getBidPrice(sym);
		while(!sold){
			var m="–";
			await ns.sleep(6000);
			if(!silent)ns.tprint(sym+"/> "+"Checking...");
			var sellprice=ns.stock.getBidPrice(sym);
			if(!silent){
				if(sellprice==prevPrice)m="~";else
				if(sellprice>prevPrice)m="+";
				ns.tprint(sym+"/> "+"["+m+"] Stock price: $"+format(sellprice));
			}
			var diff=difference(b,sellprice);
			var nextOrder=safetyOrders.length+1;
			if(nextOrder<=maxSafetyOrders&&diff<=(-(Math.abs(highest)*(nextOrder*2)))){
				var bb=ns.stock.buy(sym,perOrder);
				if(bb){
					ordered+=perOrder;
					safetyOrders.push(Math.floor(bb));
					ns.tprint(sym+"/> "+"Safety Order #"+format(nextOrder)+" at $"+format(bb));
					var orders=[b].concat(safetyOrders);
					sellat=Math.floor(eval(orders.join("+"))/orders.length);
					sellat+=Math.floor(sellat/100*profitPercentage||1);
					ns.tprint(sym+"/> "+"Sell at: $"+format(sellat));
					if(!silent)ns.tprint("[...]");
					prevPrice=sellprice;
				}
			}else
			if((!sellat&&sellprice>b)||(sellat&&sellprice>=sellat)){
				var s=ns.stock.sell(sym,ordered);
				if(!s){
					if(!silent)ns.tprint("[...]");
					prevPrice=sellprice;
				}else{
					var soldprice=ordered*s;
					ns.tprint("Sold "+ordered+" shares for $"+format(soldprice)+" at $"+format(s)+" each");
					ns.tprint("Profit of $"+format(soldprice-price)+" at $"+format(s-b)+" each");
					if(silent)ns.tprint(" ");
					sold=true
				}
			}else{
				if(!silent)ns.tprint("[...]");
				prevPrice=sellprice;
			}
		}
	}
}
