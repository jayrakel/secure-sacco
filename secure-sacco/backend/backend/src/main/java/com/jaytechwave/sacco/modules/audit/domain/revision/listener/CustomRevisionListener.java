package com.jaytechwave.sacco.modules.audit.domain.revision.listener;

import com.jaytechwave.sacco.modules.audit.domain.revision.CustomRevisionEntity;
import org.hibernate.envers.RevisionListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class CustomRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {

        CustomRevisionEntity revision = (CustomRevisionEntity) revisionEntity;

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()) {
            revision.setUsername(authentication.getName());
        } else {
            revision.setUsername("SYSTEM");
        }
    }
}