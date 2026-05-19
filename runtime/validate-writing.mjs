function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function diagnostic(code, path, message, details = {}) {
  return {
    code,
    severity: details.severity ?? "error",
    path,
    message,
    ...details,
  };
}

function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateWritingPosts(posts) {
  const diagnostics = [];

  if (!Array.isArray(posts)) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          "INVALID_WRITING_POSTS",
          "posts",
          "Writing posts must be an array."
        ),
      ],
    };
  }

  const seenSlugs = new Set();

  for (const [index, post] of posts.entries()) {
    const basePath = `posts[${index}]`;

    if (!isObject(post)) {
      diagnostics.push(
        diagnostic(
          "INVALID_WRITING_POST",
          basePath,
          "Writing post must be an object."
        )
      );
      continue;
    }

    if (typeof post.slug !== "string" || post.slug.trim() === "") {
      diagnostics.push(
        diagnostic(
          "MISSING_POST_SLUG",
          `${basePath}.slug`,
          "Post slug is required."
        )
      );
    } else if (seenSlugs.has(post.slug)) {
      diagnostics.push(
        diagnostic(
          "DUPLICATE_POST_SLUG",
          `${basePath}.slug`,
          "Post slug must be unique.",
          { received: post.slug }
        )
      );
    } else {
      seenSlugs.add(post.slug);
    }

    if (typeof post.title !== "string" || post.title.trim() === "") {
      diagnostics.push(
        diagnostic(
          "MISSING_POST_TITLE",
          `${basePath}.title`,
          "Post title is required."
        )
      );
    }

    if (typeof post.description !== "string" || post.description.trim() === "") {
      diagnostics.push(
        diagnostic(
          "MISSING_POST_DESCRIPTION",
          `${basePath}.description`,
          "Post description should not be empty.",
          { severity: "warning" }
        )
      );
    }

    if (!isValidDate(post.publishedAt)) {
      diagnostics.push(
        diagnostic(
          "INVALID_POST_DATE",
          `${basePath}.publishedAt`,
          "Post publishedAt must use YYYY-MM-DD format.",
          { received: post.publishedAt }
        )
      );
    }

    if (typeof post.body !== "string" || post.body.trim() === "") {
      diagnostics.push(
        diagnostic(
          "MISSING_POST_BODY",
          `${basePath}.body`,
          "Post body is required."
        )
      );
    }

    if (typeof post.tokenSummary !== "string" || post.tokenSummary.trim() === "") {
      diagnostics.push(
        diagnostic(
          "MISSING_POST_TOKEN_SUMMARY",
          `${basePath}.tokenSummary`,
          "Post tokenSummary should not be empty.",
          { severity: "warning" }
        )
      );
    }
  }

  return {
    ok: diagnostics.every((item) => item.severity !== "error"),
    diagnostics,
  };
}
