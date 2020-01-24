// ****************************************************************************
// PixInsight JavaScript Runtime API - PJSR Version 1.0
// ****************************************************************************
// SHO-AIP.js - Released 2020/01/23
// ****************************************************************************
//
// This file is part of SHO-AIP Script version 1.1.2
//
// Copyright (C) 2013-2020 Laurent Bourgon, Philippe Bernhard & Dave Watson.
// All Rights Reserved. Website: http://www.felopaul.com/pix.htm
//
// Redistribution and use in both source and binary forms, with or without
// modification, is permitted provided that the following conditions are met:
//
// 1. All redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//
// 2. All redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// 3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
//    of their contributors, may be used to endorse or promote products derived
//    from this software without specific prior written permission. For written
//    permission, please contact info@pixinsight.com.
//
// 4. All products derived from this software, in any form whatsoever, must
//    reproduce the following acknowledgment in the end-user documentation
//    and/or other materials provided with the product:
//
//    "This product is based on software from the PixInsight project, developed
//    by Pleiades Astrophoto and its contributors (http://pixinsight.com/)."
//
//    Alternatively, if that is where third-party acknowledgments normally
//    appear, this acknowledgment must be reproduced in the product itself.
//
// THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
// EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
// INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
// DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
// ****************************************************************************

/******************************************************************************
 * SHO-AIP.js version 1.1.2 (January 2020)
 *
 * This script allows SHO to be mixed with a L using the optional AIP Method
 *
 * Changelog:
 * 1.1.1  - 1.1.2 Development releases
 * 1.1.0  - Refactoring to PI current standards
 * 1.0.12 - Bug fixes
 * 1.0.11 - Bug fixes
 * 1.0.10 - PTeam changes for PI core version 1.8.0
 *
 *****************************************************************************/

#feature-id    Multichannel Synthesis > SHO-AIP
#feature-info A Multichannel Synthesis utility.<br/>\
	<br/>\ 
	This script allows the mixing SHO with an L using the optional AIP Method.\
	<br/>\
	Copyright &copy; 2013-2020 Laurent Bourgon, Philippe Bernhard & Dave Watson. All Rights Reserved.

#feature-icon  aip.xpm

#include <pjsr/Sizer.jsh>
#include <pjsr/Interpolation.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/ColorComboBox.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/SectionBar.jsh>

// Load the required languange, gbr.jsh or fra.jsh
#include "gbr.jsh"

// Run Time Options
#define PRELOAD_SHONRVB_IMAGES true		// If true pre-loads images starting with S,H,O,N,R,V,G or B 

#define TITLE  "SHO-AIP"
#define DEFAULT_TB_MARGIN 10
#define DEFAULT_RL_MARGIN 10
#define DEFAULT_BORDER_WIDTH 1

#define SHADOWS_CLIP -1.25
#define TARGET_BKG    0.25

#define RANGE_P  200      				//  200% normal  2000% for Nicolat?

function findMidtonesBalance( v0, v1, eps ) {
	if ( v1 <= 0 )
		return 0;

	if ( v1 >= 1 )
		return 1;

	v0 = Math.range( v0, 0.0, 1.0 );

	if ( eps )
		eps = Math.max( 1.0e-15, eps );
	else
		eps = 5.0e-05;

	var m0, m1;
	if ( v1 < v0 ) {
		m0 = 0;
		m1 = 0.5;
	} else {
		m0 = 0.5;
		m1 = 1;
	}

   for ( ;; ) {
		var m = (m0 + m1)/2;
		var v = Math.mtf( m, v1 );

		if ( Math.abs( v - v0 ) < eps )
			return m;

		if ( v < v0 )
			m1 = m;
		else
			m0 = m;
	}
}

function Inset() {		// engine object 
   console.writeln('DEBUG:Inset');
   this.RGBView= ImageWindow.activeWindow.mainView;
   this.L1 = new ImageWindow();
   this.L2 = new ImageWindow();
   this.L3 = new ImageWindow();

   if(this.RGBView.image.width==0) {
         var msg = new MessageBox( "No target images are available", "Warning", StdIcon_Warning, StdButton_Ok );
         msg.execute();
   } else {
      this.Preview= new ImageWindow(this.RGBView.image.width,
                                    this.RGBView.image.height,
                                    3,
                                    32,
                                    true,
                                    true,
                                    "MIXSHO_AIP");

      this.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
      this.Preview.mainView.image.fill( 0 );
      this.Preview.mainView.endProcess();
      this.Preview.zoomFactor=12;
      this.Preview.fitWindow();
      this.Preview.zoomToOptimalFit();
      this.Preview.show();
   }

   this.NewPic= function() {
      this.RGBView= ImageWindow.activeWindow.mainView;
      this.Preview= new ImageWindow(this.RGBView.image.width,
                                    this.RGBView.image.height,
                                    3,
                                    32,
                                    true,
                                    true,
                                    "MIXSHO_AIP");

      this.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
      this.Preview.mainView.image.fill( 0 );
      this.Preview.mainView.endProcess();
      this.Preview.zoomFactor=12;
      this.Preview.fitWindow();
      this.Preview.zoomToOptimalFit();
      this.Preview.show();
   }

   this.formule2C = new Array();
   this.formule2C["Darken"] = "Min( (IMG1 * K1), (IMG2 * K2) )";
   this.formule2C["Multiply"] = "(IMG1 * K1) * (IMG2 * K2)";
   this.formule2C["Lighten"] = "Max( (IMG1 * K1), (IMG2 * K2) )";
   this.formule2C["Screen"] = "~(~(IMG1 * K1) * ~(IMG2 * K2))";
   this.formule2C["Overlay"] = "iif( (IMG1 * K1) > 0.5, ~(~(2*((IMG1 * K1) - 0.5)) * ~(IMG2 * K2)), 2*(IMG1 * K1)*(IMG2 * K2) )";
   this.formul2C = this.formule2C["Darken"];

   this.formule3C = new Array();
   this.formule3C["Darken"] = "Min( (IMG1 * K1) , (IMG2 * K2), (IMG3 * K3) )";
   this.formule3C["Lighten"] = "Max( (IMG1 * K1), (IMG2 * K2),(IMG3 * K3) )";
   this.formule3C["Screen"] = "~(~(IMG1 * K1) * ~(IMG2 * K2) * ~(IMG3 * K3))";
   this.formule3C["Average"] = "Avg( (IMG1 * K1), (IMG2 * K2),(IMG3 * K3) )";
   this.formul3C = this.formule3C["Darken"];
};

var engine = new Inset;

function ii_dialog() {
   this.__base__ = Dialog;
   this.__base__();
   
   this.windowTitle = TITLE + ' ' + VERSION_SHO;

   var labelWidth1 = this.font.width( "-----------------------------" + 'T' );

   function ApplyAutoSTF( view, shadowsClipping, targetBackground, rgbLinked ) {
	  console.writeln( "DEBUG:ApplyAutoSTF-"+view.fullId );
      var stf = new ScreenTransferFunction;

      var n = view.image.isColor ? 3 : 1;

      if ( rgbLinked ) {
         /*
          * Try to find how many channels look as channels of an inverted image.
          * We know a channel has been inverted because the main histogram peak is
          * located over the right-hand half of the histogram. Seems simplistic
          * but this is consistent with astronomical images.
          */
         var invertedChannels = 0;
         for ( var c = 0; c < n; ++c )
         {
            view.image.selectedChannel = c;
            if ( view.image.median() > 0.5 )
               ++invertedChannels;
         }
         view.image.resetSelections();

         if ( invertedChannels < n ) {
            // Noninverted image
            var c0 = 0;
            var m = 0;
            for ( var c = 0; c < n; ++c ) {
               view.image.selectedChannel = c;
               var median = view.image.median();
               var avgDev = view.image.avgDev();
               c0 += median + shadowsClipping*avgDev;
               m  += median;
            }
            view.image.resetSelections();
            c0 = Math.range( c0/n, 0.0, 1.0 );
            m = findMidtonesBalance( targetBackground, m/n - c0 );

            stf.STF = [ // c0, c1, m, r0, r1
                        [c0, 1, m, 0, 1],
                        [c0, 1, m, 0, 1],
                        [c0, 1, m, 0, 1],
                        [0, 1, 0.5, 0, 1] ];
         } else {
            // Inverted image
            var c1 = 0;
            var m = 0;
            for ( var c = 0; c < n; ++c ) {
               view.image.selectedChannel = c;
               var median = view.image.median();
               var avgDev = view.image.avgDev();
               m  += median;
               c1 += median - shadowsClipping*avgDev;
            }
            view.image.resetSelections();
            c1 = Math.range( c1/n, 0.0, 1.0 );
            m = 1 - findMidtonesBalance( targetBackground, c1 - m/n );

            stf.STF = [ // c0, c1, m, r0, r1
                        [0, c1, m, 0, 1],
                        [0, c1, m, 0, 1],
                        [0, c1, m, 0, 1],
                        [0, 1, 0.5, 0, 1] ];
         }
      } else {
         var A = [ // c0, c1, m, r0, r1
                  [0, 1, 0.5, 0, 1],
                  [0, 1, 0.5, 0, 1],
                  [0, 1, 0.5, 0, 1],
                  [0, 1, 0.5, 0, 1] ];

         for ( var c = 0; c < n; ++c ) {
            view.image.selectedChannel = c;
            var median = view.image.median();
            var avgDev = view.image.avgDev();

            if ( median < 0.5 ) {
               // Noninverted channel
               var c0 = Math.range( median + shadowsClipping*avgDev, 0.0, 1.0 );
               var m  = findMidtonesBalance( targetBackground, median - c0 );
               A[c] = [c0, 1, m, 0, 1];
            } else {
               // Inverted channel
               var c1 = Math.range( median - shadowsClipping*avgDev, 0.0, 1.0 );
               var m  = 1 - findMidtonesBalance( targetBackground, c1 - median() );
               A[c] = [0, c1, m, 0, 1];
            }
         }

         stf.STF = A;
         view.image.resetSelections();
      }

      console.writeln( "<end><cbr/><br/><b>", view.fullId, "</b>:" );
      for ( var c = 0; c < n; ++c ) {
         console.writeln( "channel #", c );
         console.writeln( format( "c0 = %.6f", stf.STF[c][0] ) );
         console.writeln( format( "m  = %.6f", stf.STF[c][2] ) );
         console.writeln( format( "c1 = %.6f", stf.STF[c][1] ) );
      }

      stf.executeOn( view );
      console.writeln( "<end><cbr/><br/>" );
   }

   this.applySTF=function( img, stf ) {
	      var HT = new HistogramTransformation;
	      if (img.isColor) {
	         HT.H =	[	[stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]],
	                  [stf[1][1], stf[1][0], stf[1][2], stf[1][3], stf[1][4]],
	                  [stf[2][1], stf[2][0], stf[2][2], stf[2][3], stf[2][4]],
	                  [ 0, 0.5, 1, 0, 1]
	               ];
	      } else {
	         HT.H =	[	[ 0, 0.5, 1, 0, 1],
	                  [ 0, 0.5, 1, 0, 1],
	                  [ 0, 0.5, 1, 0, 1],
	                  [stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]]
	               ];
	      }

	      //console.writeln("R/K: ",  stf[0][0], ",", stf[0][1], ",", stf[0][2], ",", stf[0][3], ",", stf[0][4]);
	      //console.writeln("G  : ",  stf[1][0], ",", stf[1][1], ",", stf[1][2], ",", stf[1][3], ",", stf[1][4]);
	      //console.writeln("B  : ",  stf[2][0], ",", stf[2][1], ",", stf[2][2], ",", stf[2][3], ",", stf[2][4]);
	      //console.writeln("L  : ",  stf[3][0], ",", stf[3][1], ",", stf[3][2], ",", stf[3][3], ",", stf[3][4]);
	      //console.writeln("width: ", img.width, " height: ", img.height, " , channels: " , img.numberOfChannels, " , bitsperpixel: ", img.bitsPerSample, " , sample: ", img.sampleType, " ,is color: ", img.isColor);

	      var wtmp = new ImageWindow( img.width, img.height, img.numberOfChannels, img.bitsPerSample, img.sampleType == SampleType_Real, img.isColor, "tmpSTFWindow" );
	      var v = wtmp.mainView;
	      v.beginProcess( UndoFlag_NoSwapFile );
	      v.image.assign( img );
	      v.endProcess();
	      HT.executeOn( v, false ); // no swap file
	      var image=v.image;
	      var result=new Image(	image.width, image.height, image.numberOfChannels, image.colorSpace, image.bitsPerSample, image.sampleType);
	      result.assign(v.image);
	      wtmp.forceClose();
	      return result;
	   };
	   
   this.RemovePinkHalos = function () {
	   console.writeln( "DEBUG:Removing Pink Halos" );
	   var P = new Invert;
	   engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
       //if(engine.Preview.mainView.image.colorSpace==1) P.executeOn(engine.Preview.mainView);
       P.executeOn(engine.Preview.mainView);
       engine.Preview.mainView.endProcess();
       
	   var P = new SCNR;
	   //P.amount = 0.50;
	   P.amount = 1.00;
	   P.protectionMethod = SCNR.prototype.AverageNeutral;
	   P.colorToRemove = SCNR.prototype.Green;
	   P.preserveLightness = true;
	   engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
       //if(engine.Preview.mainView.image.colorSpace==1) P.executeOn(engine.Preview.mainView);
       P.executeOn(engine.Preview.mainView);
       engine.Preview.mainView.endProcess();
       
	   var P = new Invert;
	   engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
       //if(engine.Preview.mainView.image.colorSpace==1) P.executeOn(engine.Preview.mainView);
       P.executeOn(engine.Preview.mainView);
       engine.Preview.mainView.endProcess();
       
       if(STF) {
      	 console.writeln('DEBUG:Remove Pink Halos:AutoSTF');
      	 ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
       }
   }
   
   this.Calculate_L = function(c) {
	   console.writeln( "DEBUG:Calculate_L" );
	   if(dejala==0) {
         dejala=1;
         this.cursor = new Cursor( StdCursor_ArrowWait);
         console.show();
         var scale_L1 = opacityL1/100;
         var scale_L2 = opacityL2/100;
         var FL1 = format("%.2f", scale_L1);
         var FL2 = format("%.2f", scale_L2);

         var FL = "";

         if(c==3)
         {
            var scale_L3 = opacityL3/100;
            var FL3 = format("%.2f", scale_L3);

            FL = "K1 = " + FL1 + "; K2 = " + FL2 +"; K3 = " + FL3 +"; IMG1 = " + engine.L1 + "; IMG2 = " + engine.L2 + "; IMG3 = " + engine.L3 + "; " + engine.formul3C  ;
         }
         else
         {
            FL = "K1 = " + FL1 + "; K2 = " + FL2 +"; IMG1 = " + engine.L1 + "; IMG2 = " + engine.L2 + "; " + engine.formul2C ;
         }

          var Pix = new PixelMath;
          Pix.expression = FL;
          Pix.expression1 = "";
          Pix.expression2 = "";
          Pix.expression3 = "";
          Pix.useSingleExpression = true;
          Pix.symbols = "IMG1, IMG2, IMG3, K1,K2,K3";
          Pix.use64BitWorkingImage = false;
          Pix.rescale = RES;
          Pix.rescaleLower = 0.0000000000;
          Pix.rescaleUpper = 1.0000000000;
          Pix.truncate = true;
          Pix.truncateLower = 0.0000000000;
          Pix.truncateUpper = 1.0000000000;
          Pix.createNewImage = false;
          Pix.newImageId = "";
          Pix.newImageWidth = 0;
          Pix.newImageHeight = 0;
          Pix.newImageAlpha = false;
          Pix.newImageColorSpace = PixelMath.prototype.SameAsTarget;
          Pix.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

         var CCol = new ConvertToGrayscale;
         engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
         if(engine.Preview.mainView.image.colorSpace==1) CCol.executeOn(engine.Preview.mainView);
         Pix.executeOn(engine.Preview.mainView);
         engine.Preview.mainView.endProcess();

         if(STF) {
        	 console.writeln('DEBUG:STF-AutoSTF');
        	 ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
        	 engine.PreviewImageSTF = this.applySTF(engine.Preview.mainView.image,engine.Preview.mainView.stf);

        	 engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
        	 engine.Preview.mainView.image.assign(engine.PreviewImageSTF);
        	 engine.Preview.mainView.endProcess();
        	 //this.ScrollControl.updateView();
        	 console.writeln('DEBUG:STF-AutoSTF');
        	 ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
         }	   

         dejala=0;
         console.hide();
         this.cursor = new Cursor( StdCursor_PointingHand);
      }
   }

   this.Calculate_SHO = function() {
	   console.writeln( "DEBUG:Calculate_SHO" );
	   if(dejala==0) {
         dejala=1;
         this.cursor = new Cursor( StdCursor_ArrowWait);
         console.show();
         var Pix = new PixelMath;
         Pix.expression  = engine.S_Image+"*"+PC_S_DANS_R+"+"+engine.H_Image+"*"+PC_H_DANS_R+"+"+engine.O_Image+"*"+PC_O_DANS_R+"+"+engine.N_Image+"*"+PC_N_DANS_R+"+"+engine.R_Image+"*"+PC_R_DANS_R;
         Pix.expression1 = engine.S_Image+"*"+PC_S_DANS_V+"+"+engine.H_Image+"*"+PC_H_DANS_V+"+"+engine.O_Image+"*"+PC_O_DANS_V+"+"+engine.N_Image+"*"+PC_N_DANS_V+"+"+engine.V_Image+"*"+PC_V_DANS_V;
         Pix.expression2 = engine.S_Image+"*"+PC_S_DANS_B+"+"+engine.H_Image+"*"+PC_H_DANS_B+"+"+engine.O_Image+"*"+PC_O_DANS_B+"+"+engine.N_Image+"*"+PC_N_DANS_B+"+"+engine.B_Image+"*"+PC_B_DANS_B;
         Pix.expression3 = "";
         Pix.useSingleExpression = false;
         Pix.symbols = "";
         Pix.use64BitWorkingImage = false;
         Pix.rescale = RES;
         Pix.rescaleLower = 0.0000000000;
         Pix.rescaleUpper = 1.0000000000;
         Pix.truncate = true;
         Pix.truncateLower = 0.0000000000;
         Pix.truncateUpper = 1.0000000000;
         Pix.createNewImage = false;
         Pix.newImageId = "";
         Pix.newImageWidth = 0;
         Pix.newImageHeight = 0;
         Pix.newImageAlpha = false;
         Pix.newImageColorSpace = PixelMath.prototype.RGB;
         Pix.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

         var CCol = new ConvertToRGBColor;
         engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
         if(engine.Preview.mainView.image.colorSpace!=1) CCol.executeOn(engine.Preview.mainView);
         Pix.executeOn(engine.Preview.mainView);
         engine.Preview.mainView.endProcess();

         if(BAKN)
         {
            var BG = new BackgroundNeutralization;
            BG.backgroundReferenceViewId = "";
            BG.backgroundLow = 0.000000;
            BG.backgroundHigh = 0.100000;
            BG.useROI = false;
            BG.roiX0 = 0;
            BG.roiY0 = 0;
            BG.roiX1 = 0;
            BG.roiY1 = 0;
            BG.mode = BackgroundNeutralization.prototype.RescaleAsNeeded;
            BG.targetBackground = 0.010000;
            BG.executeOn(engine.Preview.mainView);
         }

         if(STF) {
        	 console.writeln('DEBUG:STF-AutoSTF');
        	 ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
        	 engine.PreviewImageSTF = this.applySTF(engine.Preview.mainView.image,engine.Preview.mainView.stf);

        	 engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
        	 engine.Preview.mainView.image.assign(engine.PreviewImageSTF);
        	 engine.Preview.mainView.endProcess();
        	 //this.ScrollControl.updateView();
        	 console.writeln('DEBUG:STF-AutoSTF');
        	 ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
         }	   

         dejala=0;
         console.hide();
         this.cursor = new Cursor( StdCursor_PointingHand);
      }
   }

   this.Calculate_L_SHO = function(target_window,S_Image, H_Image, O_Image, N_Image, L_Image,R_Image, V_Image, B_Image) {
	   //function Calculate_L_SHO(target_window,S_Image, H_Image, O_Image, N_Image, L_Image,R_Image, V_Image, B_Image) {
	   console.show();
	   console.writeln('DEBUG:Calculate_L_SHO');
	   var Pix = new PixelMath;
	   Pix.expression  = S_Image+"*"+PC_S_DANS_R+"+"+H_Image+"*"+PC_H_DANS_R+"+"+O_Image+"*"+PC_O_DANS_R+"+"+N_Image+"*"+PC_N_DANS_R+"+"+R_Image+"*"+PC_R_DANS_R;
	   Pix.expression1 = S_Image+"*"+PC_S_DANS_V+"+"+H_Image+"*"+PC_H_DANS_V+"+"+O_Image+"*"+PC_O_DANS_V+"+"+N_Image+"*"+PC_N_DANS_V+"+"+V_Image+"*"+PC_V_DANS_V;
	   Pix.expression2 = S_Image+"*"+PC_S_DANS_B+"+"+H_Image+"*"+PC_H_DANS_B+"+"+O_Image+"*"+PC_O_DANS_B+"+"+N_Image+"*"+PC_N_DANS_B+"+"+B_Image+"*"+PC_B_DANS_B;
	   Pix.expression3 = "";
	   Pix.useSingleExpression = false;
	   Pix.symbols = "";
	   Pix.use64BitWorkingImage = false;
	   Pix.rescale = RES;
	   Pix.rescaleLower = 0.0000000000;
	   Pix.rescaleUpper = 1.0000000000;
	   Pix.truncate = true;
	   Pix.truncateLower = 0.0000000000;
	   Pix.truncateUpper = 1.0000000000;
	   Pix.createNewImage = false;
	   Pix.newImageId = "";
	   Pix.newImageWidth = 0;
	   Pix.newImageHeight = 0;
	   Pix.newImageAlpha = false;
	   Pix.newImageColorSpace = PixelMath.prototype.RGB;
	   Pix.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
	   var CCol = new ConvertToRGBColor;
	   var ll = PC_L/100;

	    target_window.mainView.beginProcess(UndoFlag_NoSwapFile);
	    if(target_window.mainView.image.colorSpace!=1) CCol.executeOn(target_window.mainView);
	    Pix.executeOn(target_window.mainView);
	    target_window.mainView.endProcess();

	    if(AIPMIX) {
	      //console.writeln( "Start Mix HA with RGB  33%" );
	      var P1 = new LRGBCombination;
	      P1.channels = [ // enabled, id, k
	                   [false, "", 1.00000],
	                   [false, "", 1.00000],
	                   [false, "", 1.00000],
	                   [true, L_Image, 0.33000*ll]    //  33%
	                ];

	      P1.mL = 0.5;
	      P1.mc = 0.5;
	      P1.clipHighlights = true;
	      P1.noiseReduction = false;
	      P1.layersRemoved = 4;
	      P1.layersProtected = 2;

	      target_window.mainView.beginProcess(UndoFlag_NoSwapFile);
	      P1.executeOn(target_window.mainView);
	      target_window.mainView.endProcess();

	      var P2 = new ACDNR;
	      P2.applyToLightness = true;
	      P2.applyToChrominance = true;
	      P2.useMaskL = false;
	      P2.useMaskC = false;
	      P2.sigmaL = 1.5;
	      P2.sigmaC = 2.0;
	      P2.shapeL = 0.50;
	      P2.shapeC = 0.50;
	      P2.amountL = 0.20;
	      P2.amountC = 1.00;
	      P2.iterationsL = Flout_L;
	      P2.iterationsC = Flout_L;
	      P2.prefilterMethodL = ACDNR.prototype.None;
	      P2.prefilterMethodC = ACDNR.prototype.None;
	      P2.protectionMethodL = ACDNR.prototype.WeightedAverage3x3;
	      P2.protectionMethodC = ACDNR.prototype.UnweightedAverage3x3;
	      P2.minStructSizeL = 5;
	      P2.minStructSizeC = 5;
	      P2.protectDarkSidesL = false;
	      P2.protectDarkSidesC = true;
	      P2.darkSidesThresholdL = 0.015;
	      P2.darkSidesThresholdC = 0.030;
	      P2.darkSidesOverdriveL = 0.00;
	      P2.darkSidesOverdriveC = 0.00;
	      P2.protectBrightSidesL = false;
	      P2.protectBrightSidesC = true;
	      P2.brightSidesThresholdL = 0.015;
	      P2.brightSidesThresholdC = 0.030;
	      P2.brightSidesOverdriveL = 0.00;
	      P2.brightSidesOverdriveC = 0.00;
	      P2.starProtectionL = true;
	      P2.starProtectionC = true;
	      P2.starThresholdL = 0.030;
	      P2.starThresholdC = 0.030;
	      P2.previewMask = false;
	      P2.maskRemovedWaveletLayers = 1;
	      P2.maskShadowsClipping = 0.00000;
	      P2.maskHighlightsClipping = 1.00000;
	      P2.maskMTF = 0.50000;

	      target_window.mainView.beginProcess(UndoFlag_NoSwapFile);

	      P2.executeOn(target_window.mainView);
	      target_window.mainView.endProcess();

	      var P3 = new LRGBCombination;
	      P3.channels = [ // enabled, id, k
	       [false, "", 1.00000],
	       [false, "", 1.00000],
	       [false, "", 1.00000],
	       [true, L_Image, 0.66*ll]         // 66%
	      ];

	      P3.mL = 0.5;
	      P3.mc = 0.5;
	      P3.clipHighlights = true;
	      P3.noiseReduction = false;
	      P3.layersRemoved = 4;
	      P3.layersProtected = 2;

	      target_window.mainView.beginProcess(UndoFlag_NoSwapFile);
	      P3.executeOn(target_window.mainView);
	      target_window.mainView.endProcess();

	      var P4 = new ACDNR;
	      P4.applyToLightness = true;
	      P4.applyToChrominance = true;
	      P4.useMaskL = false;
	      P4.useMaskC = false;
	      P4.sigmaL = 1.5;
	      P4.sigmaC = 2.0;
	      P4.shapeL = 0.50;
	      P4.shapeC = 0.50;
	      P4.amountL = 0.20;
	      P4.amountC = 1.00;
	      P4.iterationsL = Flout_L;
	      P4.iterationsC = Flout_L;
	      P4.prefilterMethodL = ACDNR.prototype.None;
	      P4.prefilterMethodC = ACDNR.prototype.None;
	      P4.protectionMethodL = ACDNR.prototype.WeightedAverage3x3;
	      P4.protectionMethodC = ACDNR.prototype.UnweightedAverage3x3;
	      P4.minStructSizeL = 5;
	      P4.minStructSizeC = 5;
	      P4.protectDarkSidesL = false;
	      P4.protectDarkSidesC = true;
	      P4.darkSidesThresholdL = 0.015;
	      P4.darkSidesThresholdC = 0.030;
	      P4.darkSidesOverdriveL = 0.00;
	      P4.darkSidesOverdriveC = 0.00;
	      P4.protectBrightSidesL = false;
	      P4.protectBrightSidesC = true;
	      P4.brightSidesThresholdL = 0.015;
	      P4.brightSidesThresholdC = 0.030;
	      P4.brightSidesOverdriveL = 0.00;
	      P4.brightSidesOverdriveC = 0.00;
	      P4.starProtectionL = true;
	      P4.starProtectionC = true;
	      P4.starThresholdL = 0.030;
	      P4.starThresholdC = 0.030;
	      P4.previewMask = false;
	      P4.maskRemovedWaveletLayers = 1;
	      P4.maskShadowsClipping = 0.00000;
	      P4.maskHighlightsClipping = 1.00000;
	      P4.maskMTF = 0.50000;

	      target_window.mainView.beginProcess(UndoFlag_NoSwapFile);
	      P4.executeOn(target_window.mainView);
	      target_window.mainView.endProcess();
	   }

	   var P5 = new LRGBCombination;
	   P5.channels = [ 						// enabled, id, k
	    [false, "", 1.00000],
	    [false, "", 1.00000],
	    [false, "", 1.00000],
	    [true, L_Image, 1.0*ll]           	// 100%
	   ];
	   P5.mL = lightness;
	   P5.mc = saturation;
	   P5.clipHighlights = true;
	   P5.noiseReduction = noiser;
	   P5.layersRemoved = smoothed;
	   P5.layersProtected = protectedw;

	   target_window.mainView.beginProcess(UndoFlag_NoSwapFile);
	   P5.executeOn(target_window.mainView);
	   target_window.mainView.endProcess();

	   if(STF) {
		   console.writeln('DEBUG:STF-AutoSTF');
		   ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
		   engine.PreviewImageSTF = this.applySTF(engine.Preview.mainView.image,engine.Preview.mainView.stf);

           engine.Preview.mainView.beginProcess(UndoFlag_NoSwapFile);
           engine.Preview.mainView.image.assign(engine.PreviewImageSTF);
           engine.Preview.mainView.endProcess();
           //this.ScrollControl.updateView();
           console.writeln('DEBUG:STF-AutoSTF');
           ApplyAutoSTF( engine.Preview.mainView, SHADOWS_CLIP, TARGET_BKG,  OPT);
       }	   
	   
	   console.hide();
	}
 
   this.ScrollControl = new Control( this );
   this.ScrollControl.toolTip = "<p>Control the Preview window (zoom/scroll) using this image</p>";
   var w = engine.Preview.mainView.image.width;
   var h = engine.Preview.mainView.image.height;
   var SizeW=engine.Preview.viewportWidth/2;
   var SizeH=engine.Preview.viewportHeight/2;
   this.ScrollControl.setMinSize( SizeW, SizeH);
   this.ScrollControl.cursor = new Cursor( StdCursor_CirclePlus );
   this.ScrollControl.onPaint = function() {
	   if(!isClosing) {
		   var G = new Graphics( this );
		   G.drawScaledBitmap( this.boundsRect, engine.Preview.mainView.image.render() );
		   G.pen = new Pen( 0xFF00FF00 ); //Green
		   G.drawRect( this.imageRect() );
		   G.end()
		   gc();
	   }
   }
 
   this.ScrollControl.dragging = false;
   this.ScrollControl.dragOffset = null;
   
   this.ScrollControl.onMousePress = function(x,y) {
	   //engine.Preview.setViewport( x*w/SizeW, y*w/SizeW );
	   //this.update();
	   this.dragging = true;
	   this.dragOffset = new Point( x, y );
	   this.dragOffset.sub( this.imageRect().center );
   }
   
   this.ScrollControl.onMouseMove = function(x,y) {
	   if ( this.dragging ) {
	         var scale = this.scalingFactor();
	         engine.Preview.setViewport( (x - this.dragOffset.x)/scale, (y - this.dragOffset.y)/scale );
	         this.update();
	   	}
   }
 
   this.ScrollControl.onMouseRelease = function() {
      this.dragging = false;
      this.dragOffset = null;
   };

   this.onMouseWheel = function(Dx,Dy, MouseWheel) {
	   if (MouseWheel >0) {
			engine.Preview.zoomOut();
	   } else {
			engine.Preview.zoomIn();
	   }
	   this.ScrollControl.repaint();
   }
   
   this.ScrollControl.imageRect = function() {
	   var rect = engine.Preview.viewportToImage( engine.Preview.visibleViewportRect );
	   rect.mul( this.scalingFactor() );
	   return rect;
   };

   this.ScrollControl.scalingFactor = function() {
	   return Math.sqrt( this.boundsRect.area/engine.Preview.mainView.image.bounds.area );
   };

   this.ScrollControl.updateView = function() {
	  console.writeln( "DEBUG:updateView" );
      var imageWidth = engine.Preview.mainView.image.width;
      var imageHeight = engine.Preview.mainView.image.height;
      var width, height;
      if ( imageWidth > imageHeight ) {
         width = PREVIEW_SIZE;
         height = PREVIEW_SIZE*imageHeight/imageWidth;
      } else {
         width = PREVIEW_SIZE*imageWidth/imageHeight;
         height = PREVIEW_SIZE;
      }
      this.setFixedSize( width, height );
      this.kw = 1/imageWidth*width;
      this.kh = 1/imageHeight*height;
      this.update();
      this.dialog.adjustToContents();
   };
 
   this.ScrollControl.updateView( engine.Preview.mainView );

   var workspace_windows = ImageWindow.windows;

   this.L1_ImageList = new ComboBox( this );
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) this.L1_ImageList.addItem( workspace_windows[j].mainView.id );
   }
   this.L1_ImageList.onItemSelected = function(j) { engine.L1 = workspace_windows[j].mainView.id; }
   this.L1_ImageList.currentItem=-1;

   this.L2_ImageList = new ComboBox( this );
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) this.L2_ImageList.addItem( workspace_windows[j].mainView.id );
   }
   this.L2_ImageList.onItemSelected = function(j) { engine.L2 = workspace_windows[j].mainView.id; }
   this.L2_ImageList.currentItem=-1;

   this.L3_ImageList = new ComboBox( this );
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) this.L3_ImageList.addItem( workspace_windows[j].mainView.id );
   }
   this.L3_ImageList.onItemSelected = function(j) { engine.L3 = workspace_windows[j].mainView.id; }
   this.L3_ImageList.currentItem=-1;

   this.LImage_ComboBox = new ComboBox( this );
   var k=0;
   this.LImage_ComboBox.onItemSelected = function(j) { engine.L_Image = workspace_windows[j].mainView.id; }
      for ( var j = 0; j < workspace_windows.length; ++j ) {
         if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
        	 this.LImage_ComboBox.addItem( workspace_windows[j].mainView.id );
               if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='L' || workspace_windows[j].mainView.id[0]=='l')) {
            	   this.LImage_ComboBox.currentItem = j;k=1;
               }
         }
      }
      engine.L_Image = workspace_windows[this.LImage_ComboBox.currentItem].mainView.id;
      if(k==0) this.LImage_ComboBox.currentItem=-1;

   this.SImage_ComboBox = new ComboBox( this );
   var k=0;
   this.SImage_ComboBox.onItemSelected = function(j) { engine.S_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.SImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='S' || workspace_windows[j].mainView.id[0]=='s')) {
			   this.SImage_ComboBox.currentItem = j;k=1;
           }
       }
   }
   engine.S_Image = workspace_windows[this.SImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.SImage_ComboBox.currentItem=-1;

   this.OImage_ComboBox = new ComboBox( this );
   var k=0;
   this.OImage_ComboBox.onItemSelected = function(j) { engine.O_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.OImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='O' || workspace_windows[j].mainView.id[0]=='o')) {
			   this.OImage_ComboBox.currentItem = j;k=1;
           }
	   }
   }
   engine.O_Image = workspace_windows[this.OImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.OImage_ComboBox.currentItem=-1;

   this.HImage_ComboBox = new ComboBox( this );
   var k=0;
   this.HImage_ComboBox.onItemSelected = function(j) { engine.H_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.HImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='H' || workspace_windows[j].mainView.id[0]=='h')) {
			   this.HImage_ComboBox.currentItem = j;k=1;
		   }
	   }
   }
   engine.H_Image = workspace_windows[this.HImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.HImage_ComboBox.currentItem=-1;

   this.NImage_ComboBox = new ComboBox( this );
   var k=0;
   this.NImage_ComboBox.onItemSelected = function(j) { engine.N_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.NImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='N' || workspace_windows[j].mainView.id[0]=='n')) {
			   this.NImage_ComboBox.currentItem = j;k=1;
           }
	   }
   }
   engine.N_Image = workspace_windows[this.NImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.NImage_ComboBox.currentItem=-1;

   this.RImage_ComboBox = new ComboBox( this );
   var k=0;
   this.RImage_ComboBox.onItemSelected = function(j) { engine.R_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.RImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='R' || workspace_windows[j].mainView.id[0]=='r')) {
			   this.RImage_ComboBox.currentItem = j;k=1;
		   }
	   }
   }
   engine.R_Image = workspace_windows[this.RImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.RImage_ComboBox.currentItem=-1;

   this.VImage_ComboBox = new ComboBox( this );
   var k=0;
   this.VImage_ComboBox.onItemSelected = function(j) { engine.V_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.VImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='V' || workspace_windows[j].mainView.id[0]=='v' || workspace_windows[j].mainView.id[0]=='G' || workspace_windows[j].mainView.id[0]=='g')) {
			   this.VImage_ComboBox.currentItem = j;k=1;
		   }
	   }
   }
   engine.V_Image = workspace_windows[this.VImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.VImage_ComboBox.currentItem=-1;

   this.BImage_ComboBox = new ComboBox( this );
   var k=0;
   this.BImage_ComboBox.onItemSelected = function(j) { engine.B_Image = workspace_windows[j].mainView.id; }
   for ( var j = 0; j < workspace_windows.length; ++j ) {
	   if(engine.Preview.mainView.id != workspace_windows[j].mainView.id) {
		   this.BImage_ComboBox.addItem( workspace_windows[j].mainView.id );
		   if(PRELOAD_SHONRVB_IMAGES && (workspace_windows[j].mainView.id[0]=='B' || workspace_windows[j].mainView.id[0]=='b')) {
			   this.BImage_ComboBox.currentItem = j;k=1;
		   }
	   }
   }
   engine.B_Image = workspace_windows[this.BImage_ComboBox.currentItem].mainView.id;
   if(k==0) this.BImage_ComboBox.currentItem=-1;

   this.PreviewGroupsizer = new VerticalSizer;
   this.PreviewGroupsizer.margin = 6;
   this.PreviewGroupsizer.spacing = 4;
   this.PreviewGroupsizer.add( this.ScrollControl );

   this.showL2C_Button = new PushButton( this );
   this.showL2C_Button.text = TEXT17;          		// "Create L with master 1 + 2"
   this.showL2C_Button.onClick = function() {
	   this.parent.parent.Calculate_L(2);
	   this.parent.parent.ScrollControl.repaint();
   }

   this.showL3C_Button = new PushButton( this );
   this.showL3C_Button.text = TEXT16;    			// "Create L with master 1 + 2 + 3"
   this.showL3C_Button.onClick = function() {
	   this.parent.parent.Calculate_L(3);
	   this.parent.parent.ScrollControl.repaint();
   }

   this.topImageLabel = new Label( this );
   this.topImageLabel.text = "Master 1:";
   this.topImageLabel.textAlignment = TextAlign_Right|TextAlign_VertCenter;

   this.opacity_L1 = new NumericControl (this);
   this.opacity_L1.label.text = "%";
   this.opacity_L1.setRange (0, 100);
   this.opacity_L1. slider.setRange (0, 100);
   this.opacity_L1.slider.minWidth = 100;
   this.opacity_L1.setPrecision (0);
   this.opacity_L1.setValue (100);
   this.opacity_L1.onValueUpdated = function (value) { opacityL1 = value; };

   this.topImageSizer = new HorizontalSizer;
   this.topImageSizer.spacing = 4;
   this.topImageSizer.addSpacing( 5 );
   this.topImageSizer.add( this.topImageLabel );
   this.topImageSizer.addSpacing( 10 );
   this.topImageSizer.add( this.L1_ImageList,60 );
   this.topImageSizer.addSpacing( 10 );
   this.topImageSizer.add( this.opacity_L1 );
   this.topImageSizer.addSpacing( 5 );

   this.bottomImageLabel = new Label( this );
   this.bottomImageLabel.text = "Master 2:";
   this.bottomImageLabel.textAlignment = TextAlign_Right|TextAlign_VertCenter;

   this.opacity_L2 = new NumericControl (this);
   this.opacity_L2.label.text = "%";
   this.opacity_L2.setRange (0, 100);
   this.opacity_L2.slider.setRange (0, 100);
   this.opacity_L2.slider.minWidth = 100;
   this.opacity_L2.setPrecision (0);
   this.opacity_L2.setValue (100);
   this.opacity_L2.onValueUpdated = function (value) { opacityL2 = value; };

   this.bottomImageSizer = new HorizontalSizer;
   this.bottomImageSizer.spacing = 4;
   this.bottomImageSizer.addSpacing( 5 );
   this.bottomImageSizer.add( this.bottomImageLabel );
   this.bottomImageSizer.addSpacing( 10 );
   this.bottomImageSizer.add( this.L2_ImageList,60 );
   this.bottomImageSizer.addSpacing( 10 );
   this.bottomImageSizer.add( this.opacity_L2 );
   this.bottomImageSizer.addSpacing( 5 );

   this.ImageLabelL3 = new Label( this );
   this.ImageLabelL3.text = "Master 3:";
   this.ImageLabelL3.textAlignment = TextAlign_Right|TextAlign_VertCenter;

   this.opacity_L3 = new NumericControl (this);
   this.opacity_L3.label.text = "%";
   this.opacity_L3.setRange (0, 100);
   this.opacity_L3.slider.setRange (0, 100);
   this.opacity_L3.slider.minWidth = 100;
   this.opacity_L3.setPrecision (0);
   this.opacity_L3.setValue (100);
   this.opacity_L3.onValueUpdated = function (value) { opacityL3 = value; };

   this.L3ImageSizer = new HorizontalSizer;
   this.L3ImageSizer.spacing = 4;
   this.L3ImageSizer.addSpacing( 5 );
   this.L3ImageSizer.add( this.ImageLabelL3 );
   this.L3ImageSizer.addSpacing( 10 );
   this.L3ImageSizer.add( this.L3_ImageList,60 );
   this.L3ImageSizer.addSpacing( 10 );
   this.L3ImageSizer.add( this.opacity_L3 );
   this.L3ImageSizer.addSpacing( 5 );

   this.blendModeLabel2C = new Label( this );
   this.blendModeLabel2C.text = "method :";
   this.blendModeLabel2C.textAlignment = TextAlign_Right|TextAlign_VertCenter;

   this.blendModeCombo2C = new ComboBox( this );
   var key;
   for (key in engine.formule2C) {
	   this.blendModeCombo2C.addItem(key);
   }

   this.blendModeCombo2C.onItemSelected = function( index ) {
	   var i = 0;
	   for (key in engine.formule2C) {
           if (i == index) {
             console.writeln(key + " blending mode");
             engine.formul2C = engine.formule2C[key];
           }
           i++;
	   }
   }

   this.blendModeLabel3C = new Label( this );
   this.blendModeLabel3C.text = "method :";
   this.blendModeLabel3C.textAlignment = TextAlign_Right|TextAlign_VertCenter;

   this.blendModeCombo3C = new ComboBox( this );
   for (key in engine.formule3C) {
	   this.blendModeCombo3C.addItem(key);
   }

   this.blendModeCombo3C.onItemSelected = function( index ) {
	   var i = 0;
	   for (key in engine.formule3C) {
           if (i == index) {
             console.writeln(key + " blending mode");
             engine.formul3C = engine.formule3C[key];
           }
           i++;
	   }
   }

   this.showSHO_Button = new PushButton( this );
   this.showSHO_Button.text = TEXT15;          			// "Mixing SHONRVB"
   this.showSHO_Button.onClick = function() {
	   this.parent.parent.Calculate_SHO();
	   this.parent.parent.ScrollControl.repaint();
   }

    this.showLSHO_Button = new PushButton( this );
    this.showLSHO_Button.text = TEXT14;             	// "Mixing L-SHONRVB"
    this.showLSHO_Button.onClick = function() {
    	if(dejala==0) {
    		dejala=1;
    		this.dialog.cursor = new Cursor( StdCursor_ArrowWait);
    		this.parent.parent.Calculate_L_SHO(engine.Preview,engine.S_Image,engine.H_Image,engine.O_Image,engine.N_Image,engine.L_Image,engine.R_Image,engine.V_Image,engine.B_Image)
    		//engine.executeMainFunction();
    		this.parent.parent.ScrollControl.repaint();
    		dejala=0;
            this.dialog.cursor = new Cursor( StdCursor_PointingHand);
    	}
    }

    this.removePinkHalos_Button = new PushButton( this );
    this.removePinkHalos_Button.text = TEXT27;      	// "Remove Pink Halos"
    this.removePinkHalos_Button.onClick = function() {
 	   this.parent.parent.RemovePinkHalos();
 	   this.parent.parent.ScrollControl.repaint();
    }
    
   this.Newp_Button = new PushButton( this );
   this.Newp_Button.text = TEXT18;
   this.Newp_Button.onClick = function() {
	   this.dialog.LImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.SImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.OImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.HImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.NImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.RImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.VImage_ComboBox.addItem( engine.Preview.mainView.id );
	   this.dialog.BImage_ComboBox.addItem( engine.Preview.mainView.id );

	   this.dialog.L1_ImageList.addItem( engine.Preview.mainView.id );
	   this.dialog.L2_ImageList.addItem( engine.Preview.mainView.id );
	   this.dialog.L3_ImageList.addItem( engine.Preview.mainView.id );

       engine.NewPic();
   }

   this.FitImage_Button = new PushButton( this );
   this.FitImage_Button.text = TEXT28;					// "Zoom To Fit"
   this.FitImage_Button.onClick = function() {
	   engine.Preview.zoomToOptimalFit();
   }
   
   this.AIP_CheckBox = new CheckBox( this );
   this.AIP_CheckBox.text = TEXT13;          			// "Mixing with AIP Method"
   this.AIP_CheckBox.checked = AIPMIX;
   this.AIP_CheckBox.onCheck = function( checked ) {
	   AIPMIX = checked;
   };

   this.FloutControl = new NumericControl( this );

   this.FloutControl.setRange( 1, 5 );
   this.FloutControl.label.text = TEXT12;				// "Noise It: "
   this.FloutControl.label.minWidth = 50;
   this.FloutControl.slider.setRange( 1, 5 );
   this.FloutControl.slider.minWidth = 100;
   this.FloutControl.setPrecision (0);
   this.FloutControl.setValue( Flout_L);
   this.FloutControl.onValueUpdated = function( value ) {
	   Flout_L = value;
   };

   this.pourcentl = new NumericControl( this );
   this.pourcentl.setRange( 1, 100 );
   this.pourcentl.label.text = "L % : ";
   this.pourcentl.label.minWidth = 50;
   this.pourcentl.slider.setRange( 1, 100 );
   this.pourcentl.slider.minWidth = 100;
   this.pourcentl.setPrecision (0);
   this.pourcentl.setValue( PC_L);
   this.pourcentl.onValueUpdated = function( value ) {
	   PC_L = value;
   };

   this.number0fLayers_Sizer = new HorizontalSizer;
   this.number0fLayers_Sizer.setAlignment = Align_Center;
   this.number0fLayers_Sizer.addStretch();
   this.number0fLayers_Sizer.add( this.AIP_CheckBox );
   this.number0fLayers_Sizer.addStretch();
   this.number0fLayers_Sizer.add( this.FloutControl );
   this.number0fLayers_Sizer.addStretch();
   this.number0fLayers_Sizer.add( this.pourcentl );
   this.number0fLayers_Sizer.addStretch();


   this.lightnessControl = new NumericControl( this );
   this.lightnessControl.setRange( 0.0, 1.0 );
   this.lightnessControl.label.text = "Transfer Fonctions - Lightness: ";
   this.lightnessControl.slider.setRange( 0, 200);
   this.lightnessControl.slider.minWidth = 0;
   this.lightnessControl.setPrecision (3);
   this.lightnessControl.setValue( lightness);
   this.lightnessControl.onValueUpdated = function( value ) {
	   lightness = value;
   };

   this.saturationControl = new NumericControl( this );
   this.saturationControl.setRange( 0.0, 1.0 );
   this.saturationControl.label.text = "Saturation: ";
   this.saturationControl.slider.setRange( 0, 200);
   this.saturationControl.slider.minWidth = 0;
   this.saturationControl.setPrecision (3);
   this.saturationControl.setValue( saturation);
   this.saturationControl.onValueUpdated = function( value ) {
	   saturation = value;
   };

   this.CNR_CheckBox = new CheckBox( this );
   this.CNR_CheckBox.text = TEXT11; 					// "Chroma Noise Reduction"
   this.CNR_CheckBox.checked = noiser;
   this.CNR_CheckBox.onCheck = function( checked ) {
	   noiser = checked;
   };

   this.smoothed_Label = new Label (this);
   this.smoothed_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.smoothed_Label.margin = 6;
   this.smoothed_Label.text = " SmotherdWL : ";

   this.smoothed_SpinBox = new SpinBox( this );
   this.smoothed_SpinBox.minValue = 1;
   this.smoothed_SpinBox.maxValue = 6;
   this.smoothed_SpinBox.value = smoothed;
   this.smoothed_SpinBox.onValueUpdated = function( value ) 
   {
      smoothed = value;
   };

   this.protected_Label = new Label (this);
   this.protected_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.protected_Label.margin = 6;
   this.protected_Label.text = " ProtectedWL : ";
   this.protected_SpinBox = new SpinBox( this );
   this.protected_SpinBox.minValue = 0;
   this.protected_SpinBox.maxValue = 5;
   this.protected_SpinBox.value = protectedw;
   this.protected_SpinBox.onValueUpdated = function( value )
   {
      protectedw = value;
   };

   this.number3fLayers_Sizer = new HorizontalSizer;
   this.number3fLayers_Sizer.setAlignment = Align_Center;
   this.number3fLayers_Sizer.addStretch();
   this.number3fLayers_Sizer.add( this.lightnessControl );
   this.number3fLayers_Sizer.addSpacing( 10 );
   this.number3fLayers_Sizer.add( this.saturationControl );
   this.number3fLayers_Sizer.addStretch();

   this.number4fLayers_Sizer = new HorizontalSizer;
   this.number4fLayers_Sizer.setAlignment = Align_Center;
   this.number4fLayers_Sizer.addStretch();
   this.number4fLayers_Sizer.add( this.CNR_CheckBox );
   this.number4fLayers_Sizer.add( this.smoothed_Label );
   this.number4fLayers_Sizer.add( this.smoothed_SpinBox );
   this.number4fLayers_Sizer.add( this.protected_Label );
   this.number4fLayers_Sizer.add( this.protected_SpinBox );
   this.number4fLayers_Sizer.addStretch();

   this.boutL2_Sizer = new HorizontalSizer;
   this.boutL2_Sizer.setAlignment = Align_Center;
   this.boutL2_Sizer.addStretch();
   this.boutL2_Sizer.add( this.showL2C_Button,260);
   this.boutL2_Sizer.addSpacing( 20 );
   this.boutL2_Sizer.add( this.blendModeLabel2C );
   this.boutL2_Sizer.addSpacing( 20 );
   this.boutL2_Sizer.add( this.blendModeCombo2C,150 );
   this.boutL2_Sizer.addStretch();

   this.boutL3_Sizer = new HorizontalSizer;
   this.boutL3_Sizer.setAlignment = Align_Center;
   this.boutL3_Sizer.addStretch();
   this.boutL3_Sizer.add( this.showL3C_Button,260);
   this.boutL3_Sizer.addSpacing( 20 );
   this.boutL3_Sizer.add( this.blendModeLabel3C );
   this.boutL3_Sizer.addSpacing( 20 );
   this.boutL3_Sizer.add( this.blendModeCombo3C,150 );
   this.boutL3_Sizer.addStretch();

   this.boutSHO_Sizer = new HorizontalSizer;
   this.boutSHO_Sizer.setAlignment = Align_Center;
   this.boutSHO_Sizer.addStretch();
   this.boutSHO_Sizer.add( this.showSHO_Button,250);
   this.boutSHO_Sizer.addSpacing( 20 );
   this.boutSHO_Sizer.add( this.showLSHO_Button,250 );
   this.boutSHO_Sizer.addSpacing( 20 );
   this.boutSHO_Sizer.add( this.removePinkHalos_Button,250 );
   this.boutSHO_Sizer.addStretch();

   this.Res_CheckBox = new CheckBox( this );
   this.Res_CheckBox.text = TEXT10;    			//"Mixing with Rescale"
   this.Res_CheckBox.checked = RES;
   this.Res_CheckBox.onCheck = function( checked ) {
		RES = checked;
   };

   this.Res2_CheckBox = new CheckBox( this );
   this.Res2_CheckBox.text = TEXT9;          	// "Background Auto Equalise"
   this.Res2_CheckBox.checked = BAKN;
   this.Res2_CheckBox.onCheck = function( checked ) {
		BAKN = checked;
   };

   this.ASTF_CheckBox = new CheckBox( this );
   this.ASTF_CheckBox.text = "Auto STF";
   this.ASTF_CheckBox.checked = STF;
   this.ASTF_CheckBox.onCheck = function( checked ) {
		STF = checked;
   };

   this.OSTF_CheckBox = new CheckBox( this );
   this.OSTF_CheckBox.text = "Optimise STF";
   this.OSTF_CheckBox.checked = OPT;
   this.OSTF_CheckBox.onCheck = function( checked ) {
		OPT = checked;
   };

   this.helpLabel = new Label (this);
   this.helpLabel.setMaxHeight(15);
   this.helpLabel.wordWrapping = true;
   this.helpLabel.useRichText = true;
   this.helpLabel.text = "L Bourgon, P Bernhard & D Watson";

   this.ihelpLabel = new HorizontalSizer;
   this.ihelpLabel.setAlignment = Align_Center;
   this.ihelpLabel.addSpacing( 5 );
   this.ihelpLabel.add( this.helpLabel);

   this.helpLabel2 = new Label (this);
   this.helpLabel2.setMaxHeight(15);
   this.helpLabel2.wordWrapping = true;
   this.helpLabel2.useRichText = true;
   this.helpLabel2.text = "&mdash; Copyright &copy; 2020 &mdash;";

   this.ihelpLabel2 = new HorizontalSizer;
   this.ihelpLabel2.setAlignment = Align_Center;
   this.ihelpLabel2.addSpacing( 35 );
   this.ihelpLabel2.add( this.helpLabel2);

   this.number8fLayers_Sizer = new VerticalSizer;
   this.number8fLayers_Sizer.setAlignment = Align_Center;
   //this.number8fLayers_Sizer.addStretch();
   this.number8fLayers_Sizer.add( this.ihelpLabel);
   this.number8fLayers_Sizer.add( this.ihelpLabel2);
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.Newp_Button);
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.FitImage_Button);
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.Res_CheckBox );
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.Res2_CheckBox );
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.ASTF_CheckBox );
   this.number8fLayers_Sizer.addSpacing( 5 );
   this.number8fLayers_Sizer.add( this.OSTF_CheckBox );
   this.number8fLayers_Sizer.addSpacing( 50 );
   //this.number8fLayers_Sizer.addStretch();

   this.PWGroupBox = new Control( this );
   this.PWGroupBox.sizer = new HorizontalSizer;
   this.PWGroupBox.sizer.spacing = 4;
   this.PWGroupBox.sizer.add( this.PreviewGroupsizer);
   this.PWGroupBox.sizer.add( this.number8fLayers_Sizer);

   this.LAIPBox = new Control( this );
   this.LAIPBox.sizer = new VerticalSizer;
   this.LAIPBox.sizer.spacing = 6;
   this.LAIPBox.sizer.add( this.topImageSizer);
   this.LAIPBox.sizer.add( this.bottomImageSizer);
   this.LAIPBox.sizer.add( this.L3ImageSizer);
   this.LAIPBox.sizer.add( this.boutL2_Sizer);
   this.LAIPBox.sizer.add( this.boutL3_Sizer);

   this.PWMixBox = new Control( this );
   this.PWMixBox.sizer = new VerticalSizer;
   this.PWMixBox.sizer.spacing = 6;
   this.PWMixBox.sizer.add( this.number0fLayers_Sizer);
   this.PWMixBox.sizer.add( this.number3fLayers_Sizer);
   this.PWMixBox.sizer.add( this.number4fLayers_Sizer);
   this.PWMixBox.sizer.add( this.boutSHO_Sizer);

   // Image Selection Labels
   // Target
   this.TargetImage_Label = new Label (this);
   this.TargetImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.TargetImage_Label.margin = 6;
   this.TargetImage_Label.text = "Image L :";
   // S
   this.SImage_Label = new Label (this);
   this.SImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.SImage_Label.margin = 6;
   this.SImage_Label.text = "Image  SII :";
   // H
   this.HImage_Label = new Label (this);
   this.HImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.HImage_Label.margin = 6;
   this.HImage_Label.text = "Image  HA :";
   // O
   this.OImage_Label = new Label (this);
   this.OImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.OImage_Label.margin = 6;
   this.OImage_Label.text = "Image  OIII :";
   // N
   this.NImage_Label = new Label (this);
   this.NImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.NImage_Label.margin = 6;
   this.NImage_Label.text = "Image  NII :";
   // R
   this.RImage_Label = new Label (this);
   this.RImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.RImage_Label.margin = 6;
   this.RImage_Label.text = "Image  R :";
   // V
   this.VImage_Label = new Label (this);
   this.VImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.VImage_Label.margin = 6;
   this.VImage_Label.text = "Image  V :";
   // B
   this.BImage_Label = new Label (this);
   this.BImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.BImage_Label.margin = 6;
   this.BImage_Label.text = "Image  B :";
   // ----
   this.TargetImage_Sizer = new HorizontalSizer;
   this.TargetImage_Sizer.add( this.TargetImage_Label,40 );
   this.TargetImage_Sizer.addSpacing( 20 );
   this.TargetImage_Sizer.add( this.LImage_ComboBox,80);
   this.TargetImage_Sizer.addSpacing( 6 );
   this.TargetImage_Sizer.add( this.NImage_Label,40);
   this.TargetImage_Sizer.addSpacing( 20 );
   this.TargetImage_Sizer.add( this.NImage_ComboBox,80);
   this.TargetImage_Sizer.addSpacing( 6 );

   this.SImage_Sizer = new HorizontalSizer;
   this.SImage_Sizer.add( this.SImage_Label,40 );
   this.SImage_Sizer.addSpacing( 20 );
   this.SImage_Sizer.add( this.SImage_ComboBox,80);
   this.SImage_Sizer.addSpacing( 6 );
   this.SImage_Sizer.add( this.RImage_Label,40 );
   this.SImage_Sizer.addSpacing( 20 );
   this.SImage_Sizer.add( this.RImage_ComboBox, 80 );
   this.SImage_Sizer.addSpacing( 6 );

   this.HImage_Sizer = new HorizontalSizer;
   this.HImage_Sizer.add( this.HImage_Label ,40);
   this.HImage_Sizer.addSpacing( 20 );
   this.HImage_Sizer.add( this.HImage_ComboBox, 80 );
   this.HImage_Sizer.addSpacing( 6 );
   this.HImage_Sizer.add( this.VImage_Label ,40);
   this.HImage_Sizer.addSpacing( 20 );
   this.HImage_Sizer.add( this.VImage_ComboBox, 80 );
   this.HImage_Sizer.addSpacing( 6 );

   this.OImage_Sizer = new HorizontalSizer;
   this.OImage_Sizer.add( this.OImage_Label ,40);
   this.OImage_Sizer.addSpacing( 20 );
   this.OImage_Sizer.add( this.OImage_ComboBox, 80 );
   this.OImage_Sizer.addSpacing( 6 );
   this.OImage_Sizer.add( this.BImage_Label ,40);
   this.OImage_Sizer.addSpacing( 20 );
   this.OImage_Sizer.add( this.BImage_ComboBox, 80 );
   this.OImage_Sizer.addSpacing( 6 );

   this.Images_GroupBox = new Control (this);
   this.Images_GroupBox.sizer = new VerticalSizer;
   this.Images_GroupBox.sizer.addSpacing( 0 );
   this.Images_GroupBox.sizer.add ( this.TargetImage_Sizer );
   this.Images_GroupBox.sizer.add ( this.SImage_Sizer );
   this.Images_GroupBox.sizer.add ( this.HImage_Sizer );
   this.Images_GroupBox.sizer.add ( this.OImage_Sizer );

   this.S_in_R_Control = new NumericControl( this );
   this.S_in_R_Control.setRange( 0, RANGE_P );
   this.S_in_R_Control.label.text = TEXT6;  			// "Layer Red --- % SII : "
   this.S_in_R_Control.label.minWidth = labelWidth1;
   this.S_in_R_Control.slider.setRange( 0, RANGE_P );
   this.S_in_R_Control.slider.minWidth = 350;
   this.S_in_R_Control.setPrecision (0);
   this.S_in_R_Control.setValue( PC_S_DANS_R * 100);
   this.S_in_R_Control.onValueUpdated = function( value ) {
	   PC_S_DANS_R = value/100;
   };

   this.H_in_R_Control = new NumericControl( this );
   this.H_in_R_Control.setRange( 0, RANGE_P );
   this.H_in_R_Control.label.text = "% HA : ";
   this.H_in_R_Control.label.minWidth = labelWidth1;
   this.H_in_R_Control.slider.setRange( 0, RANGE_P );
   this.H_in_R_Control.slider.minWidth = 350;
   this.H_in_R_Control.setPrecision (0);
   this.H_in_R_Control.setValue( PC_H_DANS_R * 100);
   this.H_in_R_Control.onValueUpdated = function( value ) {
	   PC_H_DANS_R = value/100;
   };

   this.O_in_R_Control = new NumericControl( this );
   this.O_in_R_Control.setRange( 0, RANGE_P );
   this.O_in_R_Control.label.text = "% OIII : ";
   this.O_in_R_Control.label.minWidth = labelWidth1;
   this.O_in_R_Control.slider.setRange( 0, RANGE_P );
   this.O_in_R_Control.slider.minWidth = 350;
   this.O_in_R_Control.setPrecision (0);
   this.O_in_R_Control.setValue( PC_O_DANS_R * 100);
   this.O_in_R_Control.onValueUpdated = function( value ) {
	   PC_O_DANS_R = value/100;
   };

   this.N_in_R_Control = new NumericControl( this );
   this.N_in_R_Control.setRange( 0, RANGE_P );
   this.N_in_R_Control.label.text = "% NII : ";
   this.N_in_R_Control.label.minWidth = labelWidth1;
   this.N_in_R_Control.slider.setRange( 0, RANGE_P );
   this.N_in_R_Control.slider.minWidth = 350;
   this.N_in_R_Control.setPrecision (0);
   this.N_in_R_Control.setValue( PC_N_DANS_R * 100);
   this.N_in_R_Control.onValueUpdated = function( value ) {
	   PC_N_DANS_R = value/100;
   };

   this.S_in_V_Control = new NumericControl( this );
   this.S_in_V_Control.setRange( 0, RANGE_P );
   this.S_in_V_Control.label.text = TEXT5;           					// "Layer Green -- % SII : "
   this.S_in_V_Control.label.minWidth = labelWidth1;
   this.S_in_V_Control.slider.setRange( 0, RANGE_P );
   this.S_in_V_Control.slider.minWidth = 350;
   this.S_in_V_Control.setPrecision (0);
   this.S_in_V_Control.setValue( PC_S_DANS_V * 100);
   this.S_in_V_Control.onValueUpdated = function( value ) {
	   PC_S_DANS_V = value/100;
   };

   this.H_in_V_Control = new NumericControl( this );
   this.H_in_V_Control.setRange( 0, RANGE_P );
   this.H_in_V_Control.label.text = "% HA : ";
   this.H_in_V_Control.label.minWidth = labelWidth1;
   this.H_in_V_Control.slider.setRange( 0, RANGE_P );
   this.H_in_V_Control.slider.minWidth = 350;
   this.H_in_V_Control.setPrecision (0);
   this.H_in_V_Control.setValue( PC_H_DANS_V * 100);
   this.H_in_V_Control.onValueUpdated = function( value ) {
	   PC_H_DANS_V = value/100;
   };
   
   this.O_in_V_Control = new NumericControl( this );
   this.O_in_V_Control.setRange( 0, RANGE_P );
   this.O_in_V_Control.label.text = "% OIII : ";
   this.O_in_V_Control.label.minWidth = labelWidth1;
   this.O_in_V_Control.slider.setRange( 0, RANGE_P );
   this.O_in_V_Control.slider.minWidth = 350;
   this.O_in_V_Control.setPrecision (0);
   this.O_in_V_Control.setValue( PC_O_DANS_V * 100);
   this.O_in_V_Control.onValueUpdated = function( value ) {
	   PC_O_DANS_V = value/100;
   };

   this.N_in_V_Control = new NumericControl( this );
   this.N_in_V_Control.setRange( 0, RANGE_P );
   this.N_in_V_Control.label.text = "% NII : ";
   this.N_in_V_Control.label.minWidth = labelWidth1;
   this.N_in_V_Control.slider.setRange( 0, RANGE_P );
   this.N_in_V_Control.slider.minWidth = 350;
   this.N_in_V_Control.setPrecision (0);
   this.N_in_V_Control.setValue( PC_N_DANS_V * 100);
   this.N_in_V_Control.onValueUpdated = function( value ) {
	   PC_N_DANS_V = value/100;
   };

   this.S_in_B_Control = new NumericControl( this );
   this.S_in_B_Control.setRange( 0, RANGE_P );
   this.S_in_B_Control.label.text = TEXT4;          						// "Layer Blue --- % SII : "
   this.S_in_B_Control.label.minWidth = labelWidth1;
   this.S_in_B_Control.slider.setRange( 0, RANGE_P );
   this.S_in_B_Control.slider.minWidth = 350;
   this.S_in_B_Control.setPrecision (0);
   this.S_in_B_Control.setValue( PC_S_DANS_B * 100);
   this.S_in_B_Control.onValueUpdated = function( value ) {
	   PC_S_DANS_B = value/100;
   };

   this.H_in_B_Control = new NumericControl( this );
   this.H_in_B_Control.setRange( 0, RANGE_P );
   this.H_in_B_Control.label.text = "% HA : ";
   this.H_in_B_Control.label.minWidth = labelWidth1;
   this.H_in_B_Control.slider.setRange( 0, RANGE_P );
   this.H_in_B_Control.slider.minWidth = 350;
   this.H_in_B_Control.setPrecision (0);
   this.H_in_B_Control.setValue( PC_H_DANS_B * 100);
   this.H_in_B_Control.onValueUpdated = function( value ) {
	   PC_H_DANS_B = value/100;
   };

   this.O_in_B_Control = new NumericControl( this );
   this.O_in_B_Control.setRange( 0, RANGE_P );
   this.O_in_B_Control.label.text = "% OIII : ";
   this.O_in_B_Control.label.minWidth = labelWidth1;
   this.O_in_B_Control.slider.setRange( 0, RANGE_P );
   this.O_in_B_Control.slider.minWidth = 350;
   this.O_in_B_Control.setPrecision (0);
   this.O_in_B_Control.setValue( PC_O_DANS_B * 100);
   this.O_in_B_Control.onValueUpdated = function( value ) {
	   PC_O_DANS_B = value/100;
   };

   this.N_in_B_Control = new NumericControl( this );
   this.N_in_B_Control.setRange( 0, RANGE_P );
   this.N_in_B_Control.label.text = "% NII : ";
   this.N_in_B_Control.label.minWidth = labelWidth1;
   this.N_in_B_Control.slider.setRange( 0, RANGE_P );
   this.N_in_B_Control.slider.minWidth = 350;
   this.N_in_B_Control.setPrecision (0);
   this.N_in_B_Control.setValue( PC_N_DANS_B * 100);
   this.N_in_B_Control.onValueUpdated = function( value ) {
	   PC_N_DANS_B = value/100;
   };

   this.R_in_R_Control = new NumericControl( this );
   this.R_in_R_Control.setRange( 0, RANGE_P );
   this.R_in_R_Control.label.text = "% R : ";
   this.R_in_R_Control.label.minWidth = labelWidth1;
   this.R_in_R_Control.slider.setRange( 0, RANGE_P );
   this.R_in_R_Control.slider.minWidth = 350;
   this.R_in_R_Control.setPrecision (0);
   this.R_in_R_Control.setValue( PC_R_DANS_R * 100);
   this.R_in_R_Control.onValueUpdated = function( value ) {
	   PC_R_DANS_R = value/100;
   };

   this.V_in_V_Control = new NumericControl( this );
   this.V_in_V_Control.setRange( 0, RANGE_P );
   this.V_in_V_Control.label.text = "% V : ";
   this.V_in_V_Control.label.minWidth = labelWidth1;
   this.V_in_V_Control.slider.setRange( 0, RANGE_P );
   this.V_in_V_Control.slider.minWidth = 350;
   this.V_in_V_Control.setPrecision (0);
   this.V_in_V_Control.setValue( PC_V_DANS_V * 100);
   this.V_in_V_Control.onValueUpdated = function( value ) {
	   PC_V_DANS_V = value/100;
   };

   this.B_in_B_Control = new NumericControl( this );
   this.B_in_B_Control.setRange( 0, RANGE_P );
   this.B_in_B_Control.label.text = "% B : ";
   this.B_in_B_Control.label.minWidth = labelWidth1;
   this.B_in_B_Control.slider.setRange( 0, RANGE_P );
   this.B_in_B_Control.slider.minWidth = 350;
   this.B_in_B_Control.setPrecision (0);
   this.B_in_B_Control.setValue( PC_B_DANS_B * 100);
   this.B_in_B_Control.onValueUpdated = function( value ) {
	   PC_B_DANS_B = value/100;
   };

   this.ChannelGroupBox = new Control( this );
   this.ChannelGroupBox.sizer = new VerticalSizer;
   this.ChannelGroupBox.sizer.margin = 5;
   this.ChannelGroupBox.sizer.spacing = 0;
   this.ChannelGroupBox.sizer.add( this.S_in_R_Control);
   this.ChannelGroupBox.sizer.add( this.H_in_R_Control);
   this.ChannelGroupBox.sizer.add( this.O_in_R_Control);
   this.ChannelGroupBox.sizer.add( this.N_in_R_Control);
   this.ChannelGroupBox.sizer.add( this.R_in_R_Control);
   this.ChannelGroupBox.sizer.addSpacing( 6 );
   this.ChannelGroupBox.sizer.add( this.S_in_V_Control);
   this.ChannelGroupBox.sizer.add( this.H_in_V_Control);
   this.ChannelGroupBox.sizer.add( this.O_in_V_Control);
   this.ChannelGroupBox.sizer.add( this.N_in_V_Control);
   this.ChannelGroupBox.sizer.add( this.V_in_V_Control);
   this.ChannelGroupBox.sizer.addSpacing( 6 );
   this.ChannelGroupBox.sizer.add( this.S_in_B_Control);
   this.ChannelGroupBox.sizer.add( this.H_in_B_Control);
   this.ChannelGroupBox.sizer.add( this.O_in_B_Control);
   this.ChannelGroupBox.sizer.add( this.N_in_B_Control);
   this.ChannelGroupBox.sizer.add( this.B_in_B_Control);

   this.Load_Button = new PushButton (this);
   this.Load_Button.text = "Load";
   this.Load_Button.onClick = function()
   {
      var loadFile = new OpenFileDialog;
      if(loadFile.execute())
      {
         var fileName = loadFile.fileName;
         var f = new File;

         f.openForReading(fileName);

         PC_S_DANS_R = f.read(DataType_Float,1);
         PC_H_DANS_R = f.read(DataType_Float,1);
         PC_O_DANS_R = f.read(DataType_Float,1);
         PC_N_DANS_R = f.read(DataType_Float,1);
         PC_R_DANS_R = f.read(DataType_Float,1);

         PC_S_DANS_V = f.read(DataType_Float,1);
         PC_H_DANS_V = f.read(DataType_Float,1);
         PC_O_DANS_V = f.read(DataType_Float,1);
         PC_N_DANS_V = f.read(DataType_Float,1);
         PC_V_DANS_V = f.read(DataType_Float,1);

         PC_S_DANS_B = f.read(DataType_Float,1);
         PC_H_DANS_B = f.read(DataType_Float,1);
         PC_O_DANS_B = f.read(DataType_Float,1);
         PC_N_DANS_B = f.read(DataType_Float,1);
         PC_B_DANS_B = f.read(DataType_Float,1);

         this.dialog.S_in_R_Control.setValue( PC_S_DANS_R * 100);
         this.dialog.H_in_R_Control.setValue( PC_H_DANS_R * 100);
         this.dialog.O_in_R_Control.setValue( PC_O_DANS_R * 100);
         this.dialog.N_in_R_Control.setValue( PC_N_DANS_R * 100);
         this.dialog.R_in_R_Control.setValue( PC_R_DANS_R * 100);

         this.dialog.S_in_V_Control.setValue( PC_S_DANS_V * 100);
         this.dialog.H_in_V_Control.setValue( PC_H_DANS_V * 100);
         this.dialog.O_in_V_Control.setValue( PC_O_DANS_V * 100);
         this.dialog.N_in_V_Control.setValue( PC_N_DANS_V * 100);
         this.dialog.V_in_V_Control.setValue( PC_V_DANS_V * 100);

         this.dialog.S_in_B_Control.setValue( PC_S_DANS_B * 100);
         this.dialog.H_in_B_Control.setValue( PC_H_DANS_B * 100);
         this.dialog.O_in_B_Control.setValue( PC_O_DANS_B * 100);
         this.dialog.N_in_B_Control.setValue( PC_N_DANS_B * 100);
         this.dialog.B_in_B_Control.setValue( PC_B_DANS_B * 100);

         f.close();
      }
   };

   this.Save_Button = new PushButton (this);
   this.Save_Button.text = "Save";
   this.Save_Button.onClick = function()
   {
      var saveFile = new SaveFileDialog;
        if(saveFile.execute()) {
            var fileName = saveFile.fileName;
            var f = new File;
            f.createForWriting(fileName);

            f.write(PC_S_DANS_R,DataType_Float);
            f.write(PC_H_DANS_R,DataType_Float);
            f.write(PC_O_DANS_R,DataType_Float);
            f.write(PC_N_DANS_R,DataType_Float);
            f.write(PC_R_DANS_R,DataType_Float);

            f.write(PC_S_DANS_V,DataType_Float);
            f.write(PC_H_DANS_V,DataType_Float);
            f.write(PC_O_DANS_V,DataType_Float);
            f.write(PC_N_DANS_V,DataType_Float);
            f.write(PC_V_DANS_V,DataType_Float);

            f.write(PC_S_DANS_B,DataType_Float);
            f.write(PC_H_DANS_B,DataType_Float);
            f.write(PC_O_DANS_B,DataType_Float);
            f.write(PC_N_DANS_B,DataType_Float);
            f.write(PC_B_DANS_B,DataType_Float);

            f.close();
        }
   };

   this.okButton = new PushButton( this );
   this.okButton.text = "OK";
   #ifneq __PI_PLATFORM__ MACOSX
     this.okButton.icon = new Bitmap( ":/icons/ok.png" );
   #endif
   this.okButton.onClick = function() {
	   isClosing = true;
	   engine.Preview.deletePreviews();
	   engine.Preview.show();
	   this.dialog.ok();
   }

   this.cancelButton = new PushButton( this );
   this.cancelButton.text = "Cancel";
   #ifneq __PI_PLATFORM__ MACOSX
   	this.cancelButton.icon = this.scaledResource( ":/icons/cancel.png" );
   #endif
   this.cancelButton.onClick = function() {
	   isClosing = true;
	   engine.Preview.deletePreviews();
	   engine.Preview.forceClose();
	   this.dialog.cancel();
   }


   this.buttons_Sizer = new HorizontalSizer;
   this.buttons_Sizer.frameStyle = FrameStyle_Box;
   this.buttons_Sizer.margin = 4;
   this.buttons_Sizer.addSpacing( 90 );
   this.buttons_Sizer.add (this.Load_Button);
   this.buttons_Sizer.addSpacing( 5 );
   this.buttons_Sizer.add (this.Save_Button);
   this.buttons_Sizer.addStretch();
   this.buttons_Sizer.add (this.cancelButton);
   this.buttons_Sizer.addSpacing( 5 );
   this.buttons_Sizer.add (this.okButton);

   this.PWGroupBoxBar = new SectionBar(this);
   this.PWGroupBoxBar.setTitle(TEXT3);          	// "Window Preview Control"
   this.PWGroupBox.adjustToContents();
   this.PWGroupBox.setFixedHeight(this.PWGroupBox.height);
   this.PWGroupBox.show();
   this.PWGroupBoxBar.setSection(this.PWGroupBox);

   this.LAIPBoxBar = new SectionBar(this);
   this.LAIPBoxBar.setTitle(TEXT7);       			// "Mixing Luminance"
   this.LAIPBox.adjustToContents();
   this.LAIPBox.setFixedHeight(this.LAIPBox.height);
   this.LAIPBox.hide();
   this.LAIPBoxBar.setSection(this.LAIPBox);

   this.PWMixBoxBar = new SectionBar(this);
   this.PWMixBoxBar.setTitle(TEXT8);   				// "Mixing L SHONRVB"
   this.PWMixBox.adjustToContents();
   this.PWMixBox.setFixedHeight(this.PWMixBox.height);
   this.PWMixBox.hide();
   this.PWMixBoxBar.setSection(this.PWMixBox);

   this.Images_GroupBoxBar = new SectionBar(this);
   this.Images_GroupBoxBar.setTitle(TEXT2);     	// "Images Selection"
   this.Images_GroupBox.adjustToContents();
   this.Images_GroupBox.setFixedHeight(this.Images_GroupBox.height);
   this.Images_GroupBox.show();
   this.Images_GroupBoxBar.setSection(this.Images_GroupBox);

   this.ChannelGroupBoxBar = new SectionBar(this);
   this.ChannelGroupBoxBar.setTitle(TEXT1);     	// "Layer for pour Mix SHONRVB"
   this.ChannelGroupBox.adjustToContents();
   this.ChannelGroupBox.setFixedHeight(this.ChannelGroupBox.height);
   this.ChannelGroupBox.show();
   this.ChannelGroupBoxBar.setSection(this.ChannelGroupBox);

   this.sizer = new VerticalSizer;
   this.sizer.spacing = 4;
   this.sizer.margin = 6;
   this.sizer.add(this.PWGroupBoxBar);
   this.sizer.add(this.PWGroupBox);
   this.sizer.add(this.LAIPBoxBar);
   this.sizer.add(this.LAIPBox);
   this.sizer.add(this.PWMixBoxBar);
   this.sizer.add(this.PWMixBox);
   this.sizer.add(this.Images_GroupBoxBar);
   this.sizer.add(this.Images_GroupBox);
   this.sizer.add(this.ChannelGroupBoxBar);
   this.sizer.add(this.ChannelGroupBox);
   this.sizer.add(this.buttons_Sizer);

   this.adjustToContents();
   this.cursor = new Cursor( StdCursor_PointingHand);
}

ii_dialog.prototype = new Dialog;

// Execute Script
function main() {
   console.hide();

   var window = ImageWindow.activeWindow;

   if ( window.isNull ) {
      console.show();
      console.writeln(ERROR1);
   } else {
      var dialog = new ii_dialog();
      dialog.execute();
   }

};

var PREVIEW_SIZE = 300;

var PC_S_DANS_R = 1;
var PC_H_DANS_R = 0;
var PC_O_DANS_R = 0;
var PC_N_DANS_R = 0;
var PC_R_DANS_R = 0;

var PC_S_DANS_V = 0;
var PC_H_DANS_V = 1;
var PC_O_DANS_V = 0;
var PC_N_DANS_V = 0;
var PC_V_DANS_V = 0;

var PC_S_DANS_B = 0;
var PC_H_DANS_B = 0;
var PC_O_DANS_B = 1;
var PC_N_DANS_B = 0;
var PC_B_DANS_B = 0;

var Flout_L		= 1 ;
 
var PC_L		= 100;
var OPT			= false;

var LS 			= false;
var LH 			= true;
var LO 			= false;
var LMIX		= true;
var AIPMIX		= true;		// Mixing with AIP method, only applied on mixing L-SHONRVB 
var RES			= true;

var STF			= false;
var BAKN		= false;

var opacityL1 	= 100;
var opacityL2 	= 100;
var opacityL3 	= 100;

var dejala		= 0;

var isClosing 	= false;
var lightness 	= 0.5;
var saturation 	= 0.5;
var smoothed 	= 4;
var protectedw 	= 2;
var noiser		= false;

main();
