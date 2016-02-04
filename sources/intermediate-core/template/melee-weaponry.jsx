CreateClass({
    title: 'Melee Weaponry',
    render: function () {
        return <table>
            <thead>
                <tr>
                    <th>Weapon</th>
                    <th>Cost</th>
                    <th>Damage</th>
                    <th>Weight</th>
                    <th>Handedness</th>
                    <th>Ability</th>
                </tr>
            </thead>
            <tbody>
                {this.props.data.map(function (data) {
                    return <tr>
                        <td>{data[0]}</td>
                        <td>{data[1]}</td>
                        <td>{data[2]}</td>
                        <td>{data[3]}</td>
                        <td>{data[4]}</td>
                        <td>{data[5]}</td>
                    </tr>
                })}
            </tbody>
        </table>
    }
})