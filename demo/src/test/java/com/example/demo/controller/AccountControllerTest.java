
package com.example.demo.controller;

import com.example.demo.dto.request.ChangePasswordRequest;
import com.example.demo.service.AccountService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountControllerTest {

    private AccountService accountService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        accountService = mock(AccountService.class);

        AccountController controller =
                new AccountController(accountService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(controller)
                .build();
    }

    @Test
    void changePassword_ValidRequest_Returns200() throws Exception {

        String email = "user@gmail.com";

        String expectedMessage = "Đổi mật khẩu thành công!";

        String jsonRequest = """
                {
                    "oldPassword": "OldPass123!",
                    "newPassword": "NewPass123!",
                    "confirmPassword": "NewPass123!"
                }
                """;

        when(accountService.changePassword(
                eq(email),
                any(ChangePasswordRequest.class)
        )).thenReturn(expectedMessage);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ACCOUNT_CHANGE_PASSWORD"
                                )
                        )
                );

        mockMvc.perform(
                        post("/account/change-password")
                                .principal(authentication)
                                .contentType(MediaType.APPLICATION_JSON)
                                .characterEncoding("UTF-8")
                                .content(jsonRequest)
                )
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(
                        MediaType.TEXT_PLAIN
                ))
                .andExpect(content().encoding("UTF-8"))
                .andExpect(content().string(expectedMessage));

        verify(accountService).changePassword(
                eq(email),
                any(ChangePasswordRequest.class)
        );
    }

    
}
