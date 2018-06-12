class Session < ActiveRecord::Base
  # entirely new model
  has_many   :listings, dependent: :destroy
  # shortname e.g. "201809", longname e.g. "Fall 2018"
  validates  :shortname, presence: true, uniqueness: true
  validates  :longname, presence: true, uniqueness: true
  default_scope { order(shortname: :asc) }
end
