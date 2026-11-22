# Historical sources for the eight modes

Reviewed 22 November 2026. Each example below identifies the edition or application, the type of evidence, and a decision to make when composing a new document.

## The New Print Shop for DOS

Brøderbund’s catalogue shows a bordered room sign, printed projects and a blue application preview. The sign combines black display lettering with smaller spot illustrations. The product description lets the operator size and place several graphics and set type by line. The advertised IBM PC/Tandy product and the separately sold Companion and graphics libraries are identified on the spread. Look at the printed sign when designing for paper. The display background belongs to the preview. [Brøderbund product catalogue, printed pp. 3–5](https://www.mocagh.org/broderbund/broderbund-catalog2.pdf#page=3)

The DOS program archive supplies direct evidence about the lettering. In `printshop.zip`, the capital A in `MADERA.PNF` begins at byte 0x907 and decodes as 18 rows of five bytes, with 35 active bit positions per row. The same letter in `SIERRA.PNF` at 0x77E occupies 16 rows of four bytes, with 28 bit positions per row. Reading each row most-significant bit first recovers the two distinct letterforms. These are measurements of individual glyphs. The two faces use different shapes and dimensions. [Archived DOS program and named font resources](https://archive.org/details/msdos_broderbund_print_shop)

The shipping substitute is a modern OFL serif sampled on a one-bit grid and embedded as stepped TrueType contours. It preserves proportional spacing, lower case and editable text. The chosen square sampling grid and the PDF output are modern production decisions. Apply a ribbon or nine-pin treatment only after composing the lettering.

## GeoWorks Ensemble for IBM-compatible PCs

In GeoWorks’ own advertisement, the *Currents* festival sheet places a small graphic beside its masthead. The homeowners’ newsletter has a ruled masthead, narrow columns, small illustrations and a vertical association name. The sheets appear beside separate software screenshots. Use these printed specimens to judge type hierarchy and the size of a spot drawing. [GeoWorks advertisement, PC World, March 1991, scan p. 29](https://vintageapple.org/pcworld/pdf/PC_World_9103_March_1991.pdf#page=29)

GeoWorks’ 20 May 1991 release for Ensemble 1.2 distinguishes GeoWrite’s multiple columns and scalable outline faces from GeoDraw’s independently rotatable text, objects and bitmaps. It also describes colour and monochrome PostScript output. For a poster this supports precise object placement and scale changes. The release is evidence for tools and output options, rather than a visual specimen of a particular flyer. [GeoWorks Ensemble 1.2 release](https://www.penbasedcomputing.com/timeline/geoworks-releases-ensemble-version-12/)

Robert Bixby describes laying out a forty-page chapbook in GeoWrite, using two landscape columns as facing book pages and checking continuity by folding the sheets. It gives a concrete reason for column and gutter choices. Later vendor notes distinguish features across 1.x and 2.x. [Bixby, COMPUTE!, February/March 1992, p. 92](https://www.atarimagazines.com/compute/issue138/92_Publishing_on_a_shoe.php) · [NewDeal support document 276](https://www.geos-infobase.de/ND_DOCS/276.HTM)

## Tandy DeskMate Draw for DOS

Tandy’s tutorial illustrates a paper birthday card on printed p. 45. The following instructions construct the cake and balloons from basic tools, then place centred Roman lettering one line at a time. Page 48 introduces colour and pattern fills. Page 49 shows screen examples including a field-trip announcement flanked by outline dinosaurs, patterned chart sectors and flat-colour cars. For a music flyer, draw instruments with the same small tool vocabulary and leave space for independently placed words. Treat the page-49 canvas colour as a screen choice. [Tandy, DeskMate Getting Started, Draw, printed pp. 45–49](https://archive.org/details/DeskmateGettingStarted/page/n46/mode/2up)

The fonts in the package are licensed substitutes. Screen samples and catalogue reproductions establish composition and drawing methods. Exact raster metrics and physical printer marks require a specified device, driver and reference print.

## IBM Selectric

Use one element throughout. This starter chooses a 10-character-per-inch pica pitch and six lines per inch. Approximate the character advance with 12 pt Liberation Mono. Underline the subject, leave a blank line between sections and keep a ragged right margin. A dramatic heading comes from its placement on the sheet. [IBM history of the Selectric and its interchangeable element](https://www.ibm.com/history/selectric)

## WordStar 3.3

Set a 12-pitch document with a centred, emphasized heading and consistent paragraph indents. WordStar’s margin and print controls allow a whole document to be reflowed. The repeating hyphen-width rules stand in for a typed separator. Dot commands belong in the authoring file. Use the page to show their result. [MicroPro WordStar 3.3 Reference Manual, especially chapter 7](https://www.bitsavers.org/pdf/microPro/Wordstar_3.3/Wordstar_3.3_Reference_Manual_1983.pdf)

## MacPaint 1-bit

Work in black and white. Build tonal areas from repeated black pixels and use a silhouette for the foreground. The landscape starter is a 248 × 88 one-bit PNG. Preserve its hard pixel edges when enlarging it. Use stepped text as an editable stand-in for lettering committed to the original paint canvas. [Original MacPaint and QuickDraw, Computer History Museum](https://computerhistory.org/blog/macpaint-and-quickdraw-source-code/)

## PageMaker / LaserWriter PostScript

Build the page as a pasteboard composition. Use a generous roman headline, an italic secondary line and an independently placed vector ornament. The PDF uses modern TeX Gyre Termes OpenType/CFF faces with cubic outlines. The renderer also writes a monochrome Level 1 document.ps using Poppler pdftops. Chromium encodes the CFF-derived shapes as Type 3 glyphs in the PDF. [John Warnock on PageMaker and LaserWriter](https://archive.computerhistory.org/resources/access/text/2023/08/102738759-05-01-acc.pdf) · [TeX Gyre typefaces](https://ctan.org/pkg/tex-gyre)

## Windows 3.1 TrueType

Use the early Windows office combination of a scalable sans heading, serif body and fixed-pitch identifier. Place emphasis through size, weight and paragraph alignment. Liberation supplies modern TrueType substitutes. Windows 3.1 is the chosen reference. System 7 had shipped TrueType in 1991. The PDF uses current font rasterization. [Microsoft’s history of TrueType](https://learn.microsoft.com/en-us/typography/truetype/history) · [Microsoft’s Courier New record](https://learn.microsoft.com/en-us/typography/font-list/courier-new)
