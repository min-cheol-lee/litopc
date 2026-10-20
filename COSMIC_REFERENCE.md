# Original Cosmic design reference

The original design was frozen before the Rendered revision on 2026-10-19.

- Annotated Git tag: `reference/cosmic-original-2026-10-19`
- Exact source commit: `04b5086b372c2a39b786e4a796eba376474e3e0e`
- Frozen renderer: `frontend/components/Surface3DReference.tsx`, copied byte for byte from that commit's `Surface3DCanvas.tsx`.
- Frozen renderer SHA-256: `fc6b232dff1ae711562db59a7a55fbcc9c6f284a86cf4d36640baca7578e90f1`.
- Independent, verified Git bundle: `../temp/litopc-design-review-2026-10-19/cosmic-original-2026-10-19.bundle` (relative to the repository).
- Original screenshots: `current-classic.png` and `current-cosmic.png` in the same review directory.

## Compare locally

Run the local app, then open:

- New Rendered view: `http://127.0.0.1:3000/litopc?webgl=1`
- Original Cosmic: `http://127.0.0.1:3000/litopc?reference=cosmic`

Run the same simulation in each tab. The reference uses the original renderer,
Apple palette, camera transform, materials, background, animated emission and
particle effects. The `Spectrum` palette in the new view changes colors
only; use the reference URL to compare the complete original design.

## Restore the original visual implementation

The reference tag retains the entire original repository history. To restore
the previous visual implementation in a future change, review the working tree
first, then restore these tracked files from the tag and commit the result:

```powershell
git restore --source reference/cosmic-original-2026-10-19 -- frontend/components/Surface3DCanvas.tsx frontend/components/Viewport.tsx frontend/lib/surface3d-types.ts frontend/app/globals.css
```

This restore command discards uncommitted changes in the named files. Review
and preserve any later unrelated edits before running it. Newly added Rendered
helper files can remain unused, or be removed in the restoration commit.

If the local tag is unavailable, the separate bundle can restore the reference:

```powershell
git fetch ../temp/litopc-design-review-2026-10-19/cosmic-original-2026-10-19.bundle refs/tags/reference/cosmic-original-2026-10-19:refs/tags/reference/cosmic-original-2026-10-19
```

The reference tag is also published to `origin` with the simulator revision.
The independent bundle and screenshots remain local backups.
