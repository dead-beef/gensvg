function load(generators)
{
	let res = {};
	for(let g of generators)
	{
		res[g] = require('./' + g);
	}
	return res;
}

module.exports = load(['graph', 'wordcloud']);
