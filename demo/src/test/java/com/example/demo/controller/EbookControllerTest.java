
package com.example.demo.controller;

import com.example.demo.dto.response.BookResponse;
import com.example.demo.security.CustomUserDetailsService;
import com.example.demo.security.JwtAuthenticationFilter;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.service.BorrowService;
import com.example.demo.service.EbookService;
import com.example.demo.service.MemberService;
import com.example.demo.service.SystemConfigService;
import com.example.demo.service.TokenBlacklistService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EbookController.class)
@AutoConfigureMockMvc(addFilters = false)
class EbookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EbookService ebookService;

    @MockitoBean
    private BorrowService borrowService;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private SystemConfigService systemConfigService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private TokenBlacklistService tokenBlacklistService;

    @TempDir
    private Path tempDir;

    @Test
    void listEbooks_ReturnsBookList() throws Exception {
        BookResponse response = new BookResponse();
        response.setId(1L);
        response.setTitle("Clean Code");
        response.setAuthor("Robert C. Martin");
        response.setHasEbook(true);

        when(ebookService.listEbooks()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/ebooks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Clean Code"))
                .andExpect(jsonPath("$[0].hasEbook").value(true));

        verify(ebookService).listEbooks();
    }

    @Test
    void listEbooks_WhenEmpty_ReturnsEmptyList() throws Exception {
        when(ebookService.listEbooks()).thenReturn(List.of());

        mockMvc.perform(get("/api/ebooks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void uploadPdf_ValidPdf_ReturnsBookResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "clean-code.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "%PDF-1.4 test content".getBytes(
                        java.nio.charset.StandardCharsets.UTF_8
                )
        );

        BookResponse response = new BookResponse();
        response.setId(1L);
        response.setTitle("Clean Code");
        response.setHasEbook(true);

        when(ebookService.uploadPdf(
                org.mockito.ArgumentMatchers.eq(1L),
                any(org.springframework.web.multipart.MultipartFile.class)
        )).thenReturn(response);

        mockMvc.perform(multipart("/api/ebooks/books/{bookId}/file", 1L)
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Clean Code"))
                .andExpect(jsonPath("$.hasEbook").value(true));

        verify(ebookService).uploadPdf(
                org.mockito.ArgumentMatchers.eq(1L),
                any(org.springframework.web.multipart.MultipartFile.class)
        );
    }

    @Test
    void readPdf_WhenAuthorized_ReturnsPdfHeaders() throws Exception {
        Path pdfPath = tempDir.resolve("test-ebook.pdf");

        byte[] pdfContent = (
                "%PDF-1.4\n" +
                "Test ebook content\n" +
                "%%EOF\n"
        ).getBytes(java.nio.charset.StandardCharsets.UTF_8);

        Files.write(pdfPath, pdfContent);

        when(ebookService.getAuthorizedPdfPath(
                org.mockito.ArgumentMatchers.eq("member@example.com"),
                org.mockito.ArgumentMatchers.eq(1L),
                any(BorrowService.class)
        )).thenReturn(pdfPath);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        "member@example.com",
                        null,
                        List.of()
                );

        mockMvc.perform(get("/api/ebooks/books/1/content")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Content-Disposition",
                        org.hamcrest.Matchers.containsString("ebook-1.pdf")
                ))
                .andExpect(header().string(
                        "Cache-Control",
                        "private, no-store"
                ))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdfContent));

        verify(ebookService).getAuthorizedPdfPath(
                org.mockito.ArgumentMatchers.eq("member@example.com"),
                org.mockito.ArgumentMatchers.eq(1L),
                any(BorrowService.class)
        );
    }
}
