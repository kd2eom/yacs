import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { ConflictsService } from '../../services/conflicts.service';
import { SelectedTermService } from '../../services/selected-term.service';
// import { Course } from '../../models/course.model';
import { Term, Listing } from 'yacs-api-client';
import 'rxjs/Rx';
import {Subject, Subscription} from 'rxjs/Rx';
import * as domtoimage  from 'dom-to-image';

@Component({
  selector: 'interested-courses',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})

export class InterestedCoursesComponent implements OnInit {

  listings: Listing[] = [];
  isLoaded: boolean = false;
  private listingIds: Set<string>;
  private subscription;

  @Input() showStatusText: boolean = false;

  constructor (
      public sidebarService : SidebarService,
      private conflictsService: ConflictsService,
      private selectedTermService: SelectedTermService) {
    this.subscription = this.sidebarService.subscribe(() => {
      this.getCourses();
    });
  }

  ngOnInit () {
    this.listingIds = new Set<string>();
    this.getCourses();
  }

  get isActiveTerm(): boolean {
    return this.selectedTermService.isCurrentTermActive;
  }

  async getCourses (): Promise<void> {
    this.listingIds = this.sidebarService.getListingIds();

    // display interested courses on sidebar
    // display message to try selecting some if none
    if (this.listingIds.size > 0) {
      this.showStatusText = false;
      this.isLoaded = false;
      Listing
        .where({ id: Array.from(this.listingIds) })
        .includes('sections')
        .includes('sections.listing')
        .includes('course')
        .includes('course.subject')
        .all().then((newListings) => {
          //this.listings = listings.data;

          /*
          oldListingsSet =  new Set<string>(this.listings.map((listing) => listing.id));
          for (let new_listing of listings)
          */
          for (let i = 0; i < newListings.data.length; ++i) {
            let inCurList: boolean = false;
            console.log(newListings.data[i]);
            for (let j = 0; j < this.listings.length; ++j) {
              if (newListings.data[i].id == this.listings[j].id) {
                inCurList = true;
                console.log("inCurList is True");
              }
            }

            if (!inCurList) {
              this.listings.push(newListings.data[i]);
            }
          }

         for (let i = 0; i < this.listings.length; ++i) {
            let removeCurList: boolean = true;
            for (let j = 0; j < newListings.data.length; ++j) {
              if (this.listings[i].id == newListings.data[j].id) {
                removeCurList = false;
                console.log("removeCurList is False");
              }
            }

            if (removeCurList) {
              this.listings.splice(i, 1);
              console.log("Removed");
            }
          }
          this.conflictsService.populateConflictsCache(this.listings);
          this.isLoaded = true;
        });
    } else {
      this.showStatusText = true;
    }
  }
}
