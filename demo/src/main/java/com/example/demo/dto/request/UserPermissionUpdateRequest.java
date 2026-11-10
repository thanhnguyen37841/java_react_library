package com.example.demo.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserPermissionUpdateRequest {

    @NotNull
    private Long permissionId;

    @NotNull
    private Boolean granted;
}
