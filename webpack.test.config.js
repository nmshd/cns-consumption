const path = require("path")
const webpack = require("webpack")

module.exports = {
    mode: "development",
    node: {
        global: false
    },
    entry: "./dist-test/index.web",
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "nmshd.consumption.test.js",
        library: "NMSHDConsumptionTest",
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            src: path.resolve(__dirname, "tmp-browser/src/")
        }
    },
    devtool: "source-map",
    externals: {
        chai: "chai",
        lokijs: "loki",
        agentkeepalive: "NMSHDTransport",
        process: "NMSHDTransport",
        path: "NMSHDTransport",
        assert: "NMSHDTransport",
        util: "NMSHDTransport",
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        "@nmshd/content": "NMSHDContent",
        "@nmshd/consumption": "NMSHDConsumption",
        "@nmshd/logging-node": "NMSHDTransport",
        "@nmshd/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@js-soft/ts-serval": "TSServal",
        "@js-soft/docdb-access-mongo": "NMSHDTransport"
    }
}
