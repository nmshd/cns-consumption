import { ServalBuildInformation } from "@js-soft/ts-serval"
import { ContentBuildInformation } from "@nmshd/content"
import { CryptoBuildInformation } from "@nmshd/crypto"
import { TransportBuildInformation } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../core/AbstractTest"

export class VersioningTest extends AbstractTest {
    public run(): void {
        describe("Runtime Versions", function () {
            function expectValidBuildInformation(buildInfo: any) {
                expect(buildInfo.build).to.be.a("string")
                expect(buildInfo.commit).to.be.a("string")
                expect(buildInfo.date).to.be.a("string")
                expect(buildInfo.dependencies).to.be.an("object")
                expect(buildInfo.version).to.be.a("string")

                expect(buildInfo.build).not.equals("{{build}}")
                expect(buildInfo.commit).not.equals("{{commit}}")
                expect(buildInfo.date).not.equals("{{date}}")
                expect(buildInfo.version).not.equals("{{version}}")

                const parsedBuild = parseInt(buildInfo.build)
                expect(parsedBuild).greaterThan(0)

                expect(buildInfo.commit).lengthOf(40)

                const parsedDate = new Date(buildInfo.date)
                expect(parsedDate.getFullYear()).greaterThan(2019)

                const versions = buildInfo.version.split(".")
                expect(versions).lengthOf(3)
            }

            it("should get the current @js-soft/ts-serval build information", function () {
                const buildInfo = ServalBuildInformation.info
                expectValidBuildInformation(buildInfo)
            })

            it("should get the current @nmshd/crypto build information", function () {
                const buildInfo = CryptoBuildInformation.info
                expectValidBuildInformation(buildInfo)
                expectValidBuildInformation(buildInfo.serval)
            })

            it("should get the current @nmshd/transport build information", function () {
                const buildInfo = TransportBuildInformation.info
                expectValidBuildInformation(buildInfo)
                expectValidBuildInformation(buildInfo.crypto)
                expectValidBuildInformation(buildInfo.serval)
            })

            it("should get the current @nmshd/content build information", function () {
                const buildInfo = ContentBuildInformation.info
                expectValidBuildInformation(buildInfo)
                expectValidBuildInformation(buildInfo.transport)
                expectValidBuildInformation(buildInfo.crypto)
                expectValidBuildInformation(buildInfo.serval)
            })
        })
    }
}
