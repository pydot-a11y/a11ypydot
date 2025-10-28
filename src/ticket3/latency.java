package com.yourcompany.translation.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.jetbrains.annotations.NotNull;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ForkJoinPool;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * This implementation parallelizes C4 diagram rendering per individual diagram
 * while keeping the process synchronous and returning a zipped byte array.
 * It uses a shared ForkJoinPool for performance and avoids synchronized data structures.
 */
@Slf4j
@Service
public class C4ImagesGenerationServiceImpl implements C4ImagesGenerationService {

    /**
     * Shared ForkJoinPool for all rendering operations.
     * Reusing a static pool prevents thread creation overhead per request
     * and avoids blocking Spring's common pool (used by other background tasks).
     */
    private static final ForkJoinPool RENDERING_POOL =
            new ForkJoinPool(Math.max(2, Runtime.getRuntime().availableProcessors() - 1));

    @Override
    public byte[] convertC4WorkspaceToC4ImageByteStream(@NotNull Workspace workspace,
                                                        @NotNull ImageFormat imageFormat)
            throws ImageExportException {

        // 1️⃣ Extract diagram sets (System Context, Container, Component, etc.)
        C4DiagramSet diagramSet = getDiagramSet(workspace);
        String workspaceName = workspace.getName();

        // 2️⃣ Flatten all diagrams into individual rendering tasks
        List<DiagramTask> allDiagrams = Stream.of(
                new DiagramEntry("system_context_views", diagramSet.getSystemContextViews()),
                new DiagramEntry("container_views", diagramSet.getContainerViews()),
                new DiagramEntry("component_views", diagramSet.getComponentViews()),
                new DiagramEntry("deployment_views", diagramSet.getDeploymentViews()),
                new DiagramEntry("system_landscape_views", diagramSet.getSystemLandscapeViews()),
                new DiagramEntry("dynamic_views", diagramSet.getDynamicViews())
        )
        .flatMap(entry -> entry.views().stream()
                .map(view -> new DiagramTask(entry.label(), view)))
        .collect(Collectors.toList());

        log.info("Starting parallel rendering for workspace '{}' ({} diagrams)",
                workspaceName, allDiagrams.size());

        long start = System.currentTimeMillis();

        List<BytesForZip> bytesForZip;
        try {
            /**
             * 3️⃣ Submit rendering tasks to the shared thread pool.
             * Each diagram is processed independently in parallel.
             * The .collect(Collectors.toList()) ensures a lock-free merge of results.
             */
            bytesForZip = RENDERING_POOL.submit(() ->
                    allDiagrams.parallelStream()
                            .map(task -> {
                                try {
                                    // Render one diagram and return the BytesForZip entry
                                    return renderSingleDiagram(task, workspaceName, imageFormat);
                                } catch (Exception e) {
                                    log.error("Failed to render diagram [{}] in category [{}]: {}",
                                            task.diagram().getKey(), task.viewLabel(), e.getMessage());
                                    return null; // Continue rendering others
                                }
                            })
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList())
            ).join();
        } catch (Exception e) {
            log.error("Unexpected error during parallel rendering for workspace '{}'", workspaceName, e);
            throw new ImageExportException("Error during diagram rendering", e);
        }

        long renderTime = System.currentTimeMillis() - start;
        log.info("Rendered {} diagrams in {} ms using {} threads",
                bytesForZip.size(), renderTime, RENDERING_POOL.getParallelism());

        // 4️⃣ Build the final ZIP output (synchronous, memory-based)
        try {
            ByteArrayOutputStream zipStream = CoreUtils.getZipFileAsOutputStream(bytesForZip);
            log.info("Successfully created ZIP for workspace '{}' | Size: {} KB",
                    workspaceName, zipStream.size() / 1024);
            return zipStream.toByteArray();
        } catch (IOException e) {
            log.error("Failed to create ZIP output for workspace '{}': {}", workspaceName, e.getMessage());
            throw new ImageExportException("Error generating ZIP output", e);
        }
    }

    /**
     * Renders a single diagram and wraps the resulting bytes in a BytesForZip object.
     * This method runs in parallel for each diagram.
     */
    private BytesForZip renderSingleDiagram(@NotNull DiagramTask task,
                                            @NotNull String workspaceName,
                                            @NotNull ImageFormat imageFormat)
            throws ImageExportException {

        Diagram diagram = task.diagram();
        String diagramKey = diagram.getKey();

        // Construct file name pattern: workspaceName_viewKey.png
        String filename = String.format("%s_%s.%s", workspaceName, diagramKey, imageFormat.getExtension());

        // Actual rendering call (PlantUML, Structurizr, or your chosen engine)
        byte[] diagramBytes = getDiagramAsBytes(diagram.getDefinition(), imageFormat);

        return BytesForZip.builder()
                .data(diagramBytes)
                .filePath(String.format("%s/%s", task.viewLabel(), filename))
                .build();
    }

    /**
     * Converts a diagram definition into rendered bytes using your chosen rendering engine.
     * Replace RendererUtils.renderDiagramToBytes(...) with your actual rendering logic.
     */
    private static byte[] getDiagramAsBytes(String definition, ImageFormat imageFormat)
            throws ImageExportException {
        try {
            return RendererUtils.renderDiagramToBytes(definition, imageFormat);
        } catch (Exception e) {
            throw new ImageExportException("Failed to render diagram: " + e.getMessage(), e);
        }
    }

    // --- RECORD HELPERS ---

    /**
     * Pairs a category label with its list of diagrams.
     * Used for flattening into per-diagram tasks.
     */
    private record DiagramEntry(String label, List<Diagram> views) {}

    /**
     * Represents a single renderable diagram task (view label + diagram instance).
     */
    private record DiagramTask(String viewLabel, Diagram diagram) {}
}