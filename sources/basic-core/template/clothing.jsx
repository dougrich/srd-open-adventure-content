CreateClass({
    title: 'Clothing',
    render: function () {
        var outfits = this.props.data
        .filter(function (datum) {
            return datum[0] === 'outfit';
        })
        .sort(function (a, b) {
            return a[0].localeCompare(b[0]);
        });
        
        var articles = this.props.data
        .filter(function (datum) {
            return datum[0] === 'article';
        })
        .sort(function (a, b) {
            return a[0].localeCompare(b[0]);
        });
        return <table>
            <thead>
                <tr>
                    <th>Clothing</th>
                    <th>Cost</th>
                </tr>
            </thead>
            <tbody>
                <tr><th colSpan="2">OUTFITS</th></tr>
                {outfits.map(function (data) {
                    return <tr>
                        <td>{data[1]}</td>
                        <td>{data[2]}</td>
                    </tr>
                })}
                <tr><th colSpan="2">ARTICLES</th></tr>
                {articles.map(function (data) {
                    return <tr>
                        <td>{data[1]}</td>
                        <td>{data[2]}</td>
                    </tr>
                })}
            </tbody>
        </table>
    }
})