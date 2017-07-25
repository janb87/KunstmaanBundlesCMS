import browserSync from 'browser-sync';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server/lib/Server';

export default function createServerTask(webpackConfig) {
    return function server(done) {
        webpackConfig[0].entry = [ webpackConfig[0].entry, 'webpack-dev-server/client?http://localhost:8080/', 'webpack/hot/dev-server'];
        webpackConfig[1].entry = [ webpackConfig[1].entry, 'webpack-dev-server/client?http://localhost:8080/', 'webpack/hot/dev-server'];
        
        const compiler = webpack(webpackConfig);
        const devServer = new WebpackDevServer(compiler, {
            stats: {
                colors: true
            },
            contentBase: '.',
            hot: true,
            overlay: true{% if browserSyncUrl %},
            proxy: {
                '/nl': '{{ browserSyncUrl }}/nl'
            }
{% endif %}
        });

        devServer.listen(8080, '127.0.0.1', function () {
            console.log('Starting server on http://localhost:8080');
            done();
        });
    };
}
