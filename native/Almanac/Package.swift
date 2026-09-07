// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "Almanac",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "Almanac", targets: ["Almanac"])
    ],
    targets: [
        .executableTarget(
            name: "Almanac",
            path: "Sources/Almanac"
        )
    ]
)
