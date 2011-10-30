({
    baseUrl: ".",
    optimize: "none",
    appDir: "./amd/lib",
    dir: "./dist/build",
    paths: {
        'promised-io/promise': '../../node_modules/promised-io/promise',
        'domready': '../../ext/domready'
    },
    modules: [
        {
            name: "browser"
        }
    ]
})