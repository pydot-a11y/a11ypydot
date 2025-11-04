@Test
@DisplayName("✅ ZIP output contains all expected diagrams with correct naming")
void verifyZipStructureAndNaming() throws Exception {
    FileReader fileReader = new FileReader(C4_REQUEST_BODY_WITH_DYNAMIC_VIEWS);
    BufferedReader reader = new BufferedReader(fileReader);
    String c4Input = reader.lines().collect(Collectors.joining());

    byte[] zipOutput = c4ImagesGenerationService.exportImages(c4Input, ImageFormat.PNG);
    List<String> entries = new ArrayList<>();

    try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(zipOutput))) {
        for (ZipEntry entry; (entry = zipInputStream.getNextEntry()) != null; )
            entries.add(entry.getName());
    }

    assertEquals(6, entries.size(), "Expected 6 diagrams in ZIP for all view types");

    entries.forEach(name -> {
        assertTrue(name.endsWith(".png"), "All entries must be PNG files");
        assertTrue(name.matches(".*(system|container|component|deployment|landscape|dynamic).*"),
                "File names must contain a known view type");
    });
}


@Test
@DisplayName("⚡ Translation completes under 27 seconds for large input")
void verifyPerformanceImprovement() throws Exception {
    FileReader fileReader = new FileReader(C4_REQUEST_BODY_WITH_DYNAMIC_VIEWS);
    BufferedReader reader = new BufferedReader(fileReader);
    String c4Input = reader.lines().collect(Collectors.joining());

    StopWatch watch = new StopWatch();
    watch.start();

    byte[] result = c4ImagesGenerationService.exportImages(c4Input, ImageFormat.PNG);

    watch.stop();
    long duration = watch.getTotalTimeMillis();
    System.out.printf("⚙️ Translation completed in %d ms%n", duration);

    assertNotNull(result, "Output must not be null");
    assertTrue(result.length > 0, "ZIP file must contain data");
    assertTrue(duration < 27000, "Translation should complete under 27 seconds");
}


@Test
@DisplayName("❌ Invalid or empty DSL should throw ImageExportException")
void verifyInvalidDslThrowsException() {
    String invalidJson = "{ \"workspace\": { \"name\": \"Invalid\" }, \"views\": [] }";
    assertThrows(ImageExportException.class,
            () -> c4ImagesGenerationService.exportImages(invalidJson, ImageFormat.PNG),
            "Expected ImageExportException for invalid DSL input");
}